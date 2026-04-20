'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from './supabase'

type Ruolo = 'super_admin' | 'admin' | 'manager' | 'cassiere' | 'magazziniere' | 'commerciale'

type Profilo = {
  id: string
  email: string
  nome: string
  cognome: string
  ruolo: Ruolo
  attivo: boolean
  avatar_url: string
}

type AuthContextType = {
  user: any
  profilo: Profilo | null
  loading: boolean
  ruolo: Ruolo | null
  isSuperAdmin: boolean
  isAdmin: boolean
  isManager: boolean
  hasPermesso: (sezione: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null, profilo: null, loading: true, ruolo: null,
  isSuperAdmin: false, isAdmin: false, isManager: false,
  hasPermesso: () => false, logout: () => {}
})

// Permessi per sezione per ogni ruolo
const PERMESSI: Record<string, Ruolo[]> = {
  dashboard:    ['super_admin','admin','manager','cassiere','magazziniere','commerciale'],
  clienti:      ['super_admin','admin','manager','commerciale'],
  articoli:     ['super_admin','admin','manager','magazziniere','cassiere'],
  fatture:      ['super_admin','admin','manager','commerciale'],
  magazzino:    ['super_admin','admin','manager','magazziniere'],
  cassa:        ['super_admin','admin','manager','cassiere'],
  hr:           ['super_admin','admin'],
  commessi:     ['super_admin','admin','manager'],
  progetti:     ['super_admin','admin','manager'],
  impostazioni: ['super_admin','admin'],
  utenti:       ['super_admin'],
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profilo, setProfilo] = useState<Profilo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfilo(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfilo(session.user.id)
      else { setProfilo(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfilo(userId: string) {
    const { data } = await supabase.from('profili').select('*').eq('id', userId).single()
    setProfilo(data)
    setLoading(false)
  }

  const ruolo = profilo?.ruolo ?? null
  const isSuperAdmin = ruolo === 'super_admin'
  const isAdmin = ruolo === 'admin' || isSuperAdmin
  const isManager = ruolo === 'manager' || isAdmin

  function hasPermesso(sezione: string): boolean {
    if (!ruolo) return false
    const allowed = PERMESSI[sezione] || []
    return allowed.includes(ruolo)
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, profilo, loading, ruolo, isSuperAdmin, isAdmin, isManager, hasPermesso, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export { PERMESSI }
