'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'


export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Errore: ' + error.message)
        setLoading(false)
        return
      }
      if (data.user) {
        window.location.href = '/dashboard'
      }
    } catch(e: any) {
      setError('Errore connessione: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'40px',width:'100%',maxWidth:'400px',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <p style={{fontSize:'12px',letterSpacing:'3px',color:'#64748b',marginBottom:'8px'}}>GESTIONALE</p>
          <h1 style={{fontSize:'28px',fontWeight:'700',color:'#0f172a'}}>Accedi al tuo account</h1>
        </div>
        {error && <div style={{background:'#fee2e2',color:'#991b1b',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>{error}</div>}
        <div style={{marginBottom:'16px'}}>
          <label style={{display:'block',marginBottom:'6px',fontWeight:'500'}}>Email</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@azienda.it" style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',outline:'none'}}/>
        </div>
        <div style={{marginBottom:'24px'}}>
          <label style={{display:'block',marginBottom:'6px',fontWeight:'500'}}>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Password" style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',outline:'none'}}/>
        </div>
        <button onClick={handleLogin} disabled={loading} style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
          {loading ? 'Accesso...' : 'Accedi →'}
        </button>
      </div>
    </div>
  )
}
