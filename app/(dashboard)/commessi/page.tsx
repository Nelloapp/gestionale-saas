'use client'
import { useState } from 'react'

const commessiDemo = [
  { id:1, nome:'Luca Neri', ruolo:'Commesso', sede:'Negozio Milano', stato:'libero', cliente:'', inizio:null },
  { id:2, nome:'Sara Ferri', ruolo:'Designer', sede:'Negozio Milano', stato:'occupato', cliente:'Mario Rossi', inizio:'09:15' },
  { id:3, nome:'Marco Conti', ruolo:'Dev Senior', sede:'Deposito Centrale', stato:'pausa', cliente:'', inizio:null },
  { id:4, nome:'Paolo Russo', ruolo:'Manager', sede:'Negozio Roma', stato:'assente', cliente:'', inizio:null },
]

const statoConfig: any = {
  libero:   { bg:'#dcfce7', color:'#166534', emoji:'🟢' },
  occupato: { bg:'#dbeafe', color:'#1e40af', emoji:'🔴' },
  pausa:    { bg:'#fef9c3', color:'#854d0e', emoji:'🟡' },
  assente:  { bg:'#f1f5f9', color:'#475569', emoji:'⚫' },
}

export default function CommessiPage() {
  const [commessi, setCommessi] = useState(commessiDemo)
  const [selezionato, setSelezionato] = useState<any>(null)
  const [nomeCliente, setNomeCliente] = useState('')
  const [mostraAssegna, setMostraAssegna] = useState(false)

  const cambiaStato = (id: number, stato: string) => {
    setCommessi(commessi.map(c => c.id === id ? {...c, stato, cliente: stato==='libero'?'':c.cliente, inizio: stato==='occupato'? new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) : null} : c))
  }

  const assegnaCliente = () => {
    if (!nomeCliente || !selezionato) return
    setCommessi(commessi.map(c => c.id === selezionato.id ? {...c, stato:'occupato', cliente:nomeCliente, inizio:new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})} : c))
    setMostraAssegna(false)
    setNomeCliente('')
    setSelezionato(null)
  }

  const liberi = commessi.filter(c=>c.stato==='libero').length
  const occupati = commessi.filter(c=>c.stato==='occupato').length

  return (
    <div style={{fontFamily:'system-ui'}}>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>Gestione Commessi</h1>
        <p style={{color:'#64748b',fontSize:'14px'}}>Stato in tempo reale</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px',marginBottom:'20px'}}>
        {Object.entries(statoConfig).map(([stato, cfg]: any) => (
          <div key={stato} style={{background:'white',borderRadius:'12px',padding:'12px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',textAlign:'center'}}>
            <p style={{fontSize:'20px'}}>{cfg.emoji}</p>
            <p style={{fontSize:'20px',fontWeight:'700',color:'#0f172a'}}>{commessi.filter(c=>c.stato===stato).length}</p>
            <p style={{fontSize:'11px',color:'#64748b',textTransform:'capitalize'}}>{stato}</p>
          </div>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {commessi.map(c => (
          <div key={c.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderLeft:`4px solid ${statoConfig[c.stato]?.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <div>
                <p style={{fontWeight:'700',color:'#0f172a',fontSize:'16px'}}>{c.nome}</p>
                <p style={{color:'#64748b',fontSize:'13px'}}>{c.ruolo} · {c.sede}</p>
              </div>
              <span style={{background:statoConfig[c.stato]?.bg,color:statoConfig[c.stato]?.color,padding:'4px 12px',borderRadius:'99px',fontSize:'12px',fontWeight:'700'}}>
                {statoConfig[c.stato]?.emoji} {c.stato}
              </span>
            </div>

            {c.stato==='occupato' && c.cliente && (
              <div style={{background:'#f0f9ff',borderRadius:'8px',padding:'10px',marginBottom:'12px'}}>
                <p style={{color:'#1e40af',fontSize:'13px',fontWeight:'600'}}>👤 Cliente: {c.cliente}</p>
                {c.inizio && <p style={{color:'#64748b',fontSize:'12px'}}>⏰ Inizio: {c.inizio}</p>}
              </div>
            )}

            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {c.stato!=='libero' && <button onClick={()=>cambiaStato(c.id,'libero')} style={{flex:1,background:'#dcfce7',color:'#166534',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>🟢 Libero</button>}
              {c.stato==='libero' && <button onClick={()=>{setSelezionato(c);setMostraAssegna(true)}} style={{flex:1,background:'#dbeafe',color:'#1e40af',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>👤 Assegna Cliente</button>}
              {c.stato!=='pausa' && c.stato!=='assente' && <button onClick={()=>cambiaStato(c.id,'pausa')} style={{flex:1,background:'#fef9c3',color:'#854d0e',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>🟡 Pausa</button>}
              {c.stato!=='assente' && <button onClick={()=>cambiaStato(c.id,'assente')} style={{flex:1,background:'#f1f5f9',color:'#475569',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>⚫ Assente</button>}
            </div>
          </div>
        ))}
      </div>

      {mostraAssegna && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'16px 16px 0 0',padding:'24px',width:'100%'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700'}}>Assegna Cliente a {selezionato?.nome}</h2>
              <button onClick={()=>setMostraAssegna(false)} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>×</button>
            </div>
            <input placeholder="Nome cliente" value={nomeCliente} onChange={e=>setNomeCliente(e.target.value)}
              style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',outline:'none',marginBottom:'16px'}}/>
            <button onClick={assegnaCliente} style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              ✅ Assegna
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
