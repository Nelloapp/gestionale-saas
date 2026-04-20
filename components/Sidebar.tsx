'use client'
import { useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { usePathname } from 'next/navigation'

const menuGruppi = [
  {
    gruppo: 'PRINCIPALE',
    voci: [
      { href: '/dashboard',    icon: '📊', label: 'Dashboard',    sezione: 'dashboard' },
      { href: '/cassa',        icon: '🖥️', label: 'Cassa Veloce', sezione: 'cassa' },
    ]
  },
  {
    gruppo: 'VENDITE',
    voci: [
      { href: '/documenti',    icon: '📄', label: 'Documenti',    sezione: 'documenti' },
      { href: '/scadenzario',  icon: '📅', label: 'Scadenzario',  sezione: 'scadenzario' },
      { href: '/mastrino',     icon: '📊', label: 'Mastrino',     sezione: 'mastrino' },
    ]
  },
  {
    gruppo: 'ANAGRAFICHE',
    voci: [
      { href: '/clienti',      icon: '👥', label: 'Clienti',      sezione: 'clienti' },
      { href: '/articoli',     icon: '📦', label: 'Articoli',     sezione: 'articoli' },
    ]
  },
  {
    gruppo: 'MAGAZZINO',
    voci: [
      { href: '/magazzino',    icon: '🏭', label: 'Magazzino',    sezione: 'magazzino' },
    ]
  },
  {
    gruppo: 'GESTIONE',
    voci: [
      { href: '/commessi',     icon: '🏪', label: 'Commessi',     sezione: 'commessi' },
      { href: '/progetti',     icon: '📁', label: 'Progetti',     sezione: 'progetti' },
      { href: '/hr',           icon: '👤', label: 'HR',           sezione: 'hr' },
    ]
  },
  {
    gruppo: 'SISTEMA',
    voci: [
      { href: '/utenti',       icon: '🔐', label: 'Utenti',       sezione: 'utenti' },
      { href: '/impostazioni', icon: '⚙️', label: 'Impostazioni', sezione: 'impostazioni' },
    ]
  },
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
  const badge = ruolo ? badgeRuolo[ruolo] : null

  return (
    <>
      {/* Topbar */}
      <div style={{position:'fixed',top:0,left:0,right:0,height:'56px',background:'#0f172a',display:'flex',alignItems:'center',padding:'0 16px',zIndex:100,gap:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
        <button onClick={()=>setOpen(!open)} style={{background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px',borderRadius:'6px',transition:'background 0.2s'}}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e293b'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
          {open ? '✕' : '☰'}
        </button>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'20px'}}>⚡</span>
          <span style={{color:'white',fontWeight:'800',fontSize:'15px',letterSpacing:'1px'}}>GESTIONALE PRO</span>
        </div>
        {/* Breadcrumb */}
        <div style={{marginLeft:16,fontSize:13,color:'#64748b'}}>
          {pathname.replace('/', '').replace(/-/g, ' ') || 'dashboard'}
        </div>
        {badge && (
          <span style={{marginLeft:'auto',background:badge.color,color:'white',padding:'4px 12px',borderRadius:'99px',fontSize:'11px',fontWeight:'700',letterSpacing:'0.5px'}}>
            {badge.label}
          </span>
        )}
        {profilo && (
          <div style={{width:'34px',height:'34px',borderRadius:'50%',background:badge?.color||'#3b82f6',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'800',fontSize:'14px',cursor:'pointer',marginLeft:badge?8:0}}
            title={profilo.nome || profilo.email}>
            {(profilo.nome||profilo.email||'U')[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Overlay */}
      {open && <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:200,backdropFilter:'blur(2px)'}}/>}

      {/* Sidebar drawer */}
      <div style={{position:'fixed',top:0,left:open?0:'-300px',width:'280px',height:'100vh',background:'#0f172a',zIndex:300,transition:'left 0.25s cubic-bezier(0.4,0,0.2,1)',display:'flex',flexDirection:'column',boxShadow:'4px 0 20px rgba(0,0,0,0.4)'}}>
        {/* Profilo utente */}
        <div style={{padding:'20px 20px 16px',borderBottom:'1px solid #1e293b',marginTop:'56px'}}>
          {profilo ? (
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'12px',background:badge?.color||'#3b82f6',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'800',fontSize:'18px',flexShrink:0}}>
                {(profilo.nome||profilo.email||'U')[0].toUpperCase()}
              </div>
              <div style={{minWidth:0}}>
                <p style={{color:'white',fontWeight:'700',fontSize:'14px',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profilo.nome || profilo.email}</p>
                <p style={{color:'#64748b',fontSize:'11px',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profilo.email}</p>
                <span style={{display:'inline-block',background:badge?.color||'#3b82f6',color:'white',padding:'1px 8px',borderRadius:'99px',fontSize:'10px',fontWeight:'700',marginTop:'4px'}}>
                  {badge?.label || ruolo}
                </span>
              </div>
            </div>
          ) : (
            <p style={{color:'#94a3b8',fontSize:'13px',margin:0}}>Caricamento...</p>
          )}
        </div>

        {/* Menu a gruppi */}
        <nav style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {menuGruppi.map(gruppo => {
            const vociFiltrate = gruppo.voci.filter(item => hasPermesso(item.sezione))
            if (vociFiltrate.length === 0) return null
            return (
              <div key={gruppo.gruppo}>
                <div style={{padding:'10px 20px 4px',fontSize:'10px',fontWeight:'700',color:'#475569',letterSpacing:'1.5px'}}>
                  {gruppo.gruppo}
                </div>
                {vociFiltrate.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <a key={item.href} href={item.href} onClick={()=>setOpen(false)}
                      style={{
                        display:'flex',alignItems:'center',gap:'12px',padding:'10px 20px',
                        color: isActive ? 'white' : '#94a3b8',
                        background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                        borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                        textDecoration:'none',fontSize:'14px',fontWeight: isActive ? '600' : '400',
                        transition:'all 0.15s',borderRadius: isActive ? '0 8px 8px 0' : '0',
                        marginRight: '8px'
                      }}
                      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}}
                      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}}>
                      <span style={{fontSize:'16px',width:'20px',textAlign:'center'}}>{item.icon}</span>
                      <span>{item.label}</span>
                      {isActive && <span style={{marginLeft:'auto',width:'6px',height:'6px',borderRadius:'50%',background:'#3b82f6',flexShrink:0}}/>}
                    </a>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{padding:'16px',borderTop:'1px solid #1e293b'}}>
          <div style={{fontSize:'11px',color:'#475569',textAlign:'center',marginBottom:'10px'}}>
            v2.0 · Gestionale Pro
          </div>
          <button onClick={logout}
            style={{display:'block',width:'100%',background:'rgba(239,68,68,0.15)',color:'#f87171',borderRadius:'8px',padding:'10px',textAlign:'center',border:'1px solid rgba(239,68,68,0.3)',fontSize:'13px',fontWeight:'600',cursor:'pointer',transition:'all 0.2s'}}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.color = 'white' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)'; (e.currentTarget as HTMLElement).style.color = '#f87171' }}>
            🚪 Esci
          </button>
        </div>
      </div>

      {/* Spacer per la topbar */}
      <div style={{height:'56px'}}/>
    </>
  )
}
