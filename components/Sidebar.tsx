'use client'
import { useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { usePathname } from 'next/navigation'

const menu = [
  { href: '/dashboard',    icon: '📊', label: 'Dashboard',    sezione: 'dashboard' },
  { href: '/clienti',      icon: '👥', label: 'Clienti',      sezione: 'clienti' },
  { href: '/articoli',     icon: '📦', label: 'Articoli',     sezione: 'articoli' },
  { href: '/fatture',      icon: '🧾', label: 'Fatture',      sezione: 'fatture' },
  { href: '/magazzino',    icon: '🏭', label: 'Magazzino',    sezione: 'magazzino' },
  { href: '/cassa',        icon: '🖥️', label: 'Cassa',        sezione: 'cassa' },
  { href: '/commessi',     icon: '🏪', label: 'Commessi',     sezione: 'commessi' },
  { href: '/progetti',     icon: '📁', label: 'Progetti',     sezione: 'progetti' },
  { href: '/hr',           icon: '👤', label: 'HR',           sezione: 'hr' },
  { href: '/impostazioni', icon: '⚙️', label: 'Impostazioni', sezione: 'impostazioni' },
  { href: '/utenti',       icon: '🔐', label: 'Utenti',       sezione: 'utenti' },
]

const badgeRuolo: Record<string, { label: string; color: string }> = {
  super_admin:  { label: 'Super Admin', color: '#8b5cf6' },
  admin:        { label: 'Admin',       color: '#3b82f6' },
  manager:      { label: 'Manager',     color: '#22c55e' },
  cassiere:     { label: 'Cassiere',    color: '#f59e0b' },
  magazziniere: { label: 'Magazziniere',color: '#06b6d4' },
  commerciale:  { label: 'Commerciale', color: '#ec4899' },
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const { profilo, ruolo, hasPermesso, logout, loading } = useAuth()
  const pathname = usePathname()

  const menuFiltrato = menu.filter(item => hasPermesso(item.sezione))
  const badge = ruolo ? badgeRuolo[ruolo] : null

  return (
    <>
      <div style={{position:'fixed',top:0,left:0,right:0,height:'56px',background:'#1e293b',display:'flex',alignItems:'center',padding:'0 16px',zIndex:100,gap:'16px'}}>
        <button onClick={()=>setOpen(!open)} style={{background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px'}}>☰</button>
        <span style={{color:'white',fontWeight:'700',fontSize:'16px',letterSpacing:'2px'}}>GESTIONALE</span>
        {badge && (
          <span style={{marginLeft:'auto',background:badge.color,color:'white',padding:'3px 10px',borderRadius:'99px',fontSize:'11px',fontWeight:'700'}}>
            {badge.label}
          </span>
        )}
      </div>
      {open && <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200}}/>}
      <div style={{position:'fixed',top:0,left:open?0:'-280px',width:'280px',height:'100vh',background:'#1e293b',zIndex:300,transition:'left 0.3s ease',display:'flex',flexDirection:'column'}}>
        {/* Header sidebar */}
        <div style={{padding:'20px',borderBottom:'1px solid #334155',marginTop:'56px'}}>
          {profilo ? (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'50%',background:badge?.color||'#3b82f6',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'16px'}}>
                  {(profilo.nome||profilo.email||'U')[0].toUpperCase()}
                </div>
                <div>
                  <p style={{color:'white',fontWeight:'600',fontSize:'14px',margin:0}}>{profilo.nome || profilo.email}</p>
                  <span style={{background:badge?.color||'#3b82f6',color:'white',padding:'1px 8px',borderRadius:'99px',fontSize:'10px',fontWeight:'700'}}>
                    {badge?.label || ruolo}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p style={{color:'#94a3b8',fontSize:'13px',margin:0}}>Caricamento...</p>
          )}
        </div>
        {/* Menu */}
        <nav style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {menuFiltrato.map(item => {
            const isActive = pathname === item.href
            return (
              <a key={item.href} href={item.href} onClick={()=>setOpen(false)}
                style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 20px',
                  color: isActive ? 'white' : '#94a3b8',
                  background: isActive ? '#3b82f620' : 'transparent',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  textDecoration:'none',fontSize:'14px',transition:'all 0.2s'}}>
                <span style={{fontSize:'18px'}}>{item.icon}</span>
                {item.label}
              </a>
            )
          })}
        </nav>
        {/* Footer */}
        <div style={{padding:'16px',borderTop:'1px solid #334155'}}>
          <button onClick={logout}
            style={{display:'block',width:'100%',background:'#ef4444',color:'white',borderRadius:'8px',padding:'10px',textAlign:'center',border:'none',fontSize:'14px',fontWeight:'500',cursor:'pointer'}}>
            🚪 Esci
          </button>
        </div>
      </div>
      <div style={{height:'56px'}}/>
    </>
  )
}
