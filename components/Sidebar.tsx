'use client'
import { useState } from 'react'

const menu = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/clienti', icon: '👥', label: 'Clienti' },
  { href: '/articoli', icon: '📦', label: 'Articoli' },
  { href: '/fatture', icon: '🧾', label: 'Fatture' },
  { href: '/magazzino', icon: '🏭', label: 'Magazzino' },
  { href: '/cassa', icon: '🖥️', label: 'Cassa' },
  { href: '/hr', icon: '👤', label: 'HR' },
  { href: '/commessi', icon: '🏪', label: 'Commessi' },
  { href: '/progetti', icon: '📁', label: 'Progetti' },
  { href: '/impostazioni', icon: '⚙️', label: 'Impostazioni' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div style={{position:'fixed',top:0,left:0,right:0,height:'56px',background:'#1e293b',display:'flex',alignItems:'center',padding:'0 16px',zIndex:100,gap:'16px'}}>
        <button onClick={()=>setOpen(!open)} style={{background:'none',border:'none',color:'white',fontSize:'22px',cursor:'pointer',padding:'4px 8px'}}>☰</button>
        <span style={{color:'white',fontWeight:'700',fontSize:'16px',letterSpacing:'2px'}}>GESTIONALE</span>
      </div>

      {open && <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200}}/>}

      <div style={{position:'fixed',top:0,left:open?0:'-260px',width:'260px',height:'100vh',background:'#1e293b',zIndex:300,transition:'left 0.3s ease',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'20px',borderBottom:'1px solid #334155',marginTop:'56px'}}>
          <p style={{color:'white',fontWeight:'700',fontSize:'16px'}}>Menu</p>
        </div>
        <nav style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {menu.map(item => (
            <a key={item.href} href={item.href} onClick={()=>setOpen(false)}
              style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 20px',color:'#94a3b8',textDecoration:'none',fontSize:'14px',transition:'all 0.2s'}}>
              <span style={{fontSize:'18px'}}>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{padding:'16px',borderTop:'1px solid #334155'}}>
          <a href="/login" style={{display:'block',background:'#ef4444',color:'white',borderRadius:'8px',padding:'10px',textAlign:'center',textDecoration:'none',fontSize:'14px',fontWeight:'500'}}>
            🚪 Esci
          </a>
        </div>
      </div>

      <div style={{height:'56px'}}/>
    </>
  )
}
