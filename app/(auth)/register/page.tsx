'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Briefcase, Mail, Lock, UserPlus } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Le password non corrispondono.')
      return
    }

    setIsLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsLoading(false)
      return
    }

    const userId = data.user?.id

    if (!userId) {
      setError('Registrazione completata. Controlla la tua email per confermare l&#39;account.')
      setIsLoading(false)
      return
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName })
      .select('id')
      .single()

    if (companyError || !companyData?.id) {
      setError(companyError?.message || 'Impossibile creare l’azienda.')
      setIsLoading(false)
      return
    }

    const { error: companyUserError } = await supabase.from('company_users').insert({
      company_id: companyData.id,
      user_id: userId,
    })

    if (companyUserError) {
      setError(companyUserError.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Registrazione</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">Crea un nuovo account aziendale</h1>
          <p className="mt-3 text-sm text-slate-500">Avvia la tua esperienza SaaS con Gest-Seni.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-slate-700">
              Nome Azienda
            </label>
            <div className="relative mt-2">
              <Briefcase className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="company"
                name="company"
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Nome Azienda"
                className="form-input pl-12"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@azienda.it"
                className="form-input pl-12"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Crea una password"
                className="form-input pl-12"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              Conferma Password
            </label>
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Conferma la password"
                className="form-input pl-12"
                required
              />
            </div>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isLoading}
          >
            {isLoading ? 'Registrazione in corso...' : 'Registrati'}
            <UserPlus className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Hai già un account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Accedi qui
          </Link>
        </p>
      </div>
    </div>
  )
}
