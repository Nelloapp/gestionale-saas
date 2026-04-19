'use client'
import { useState } from 'react'

const dipendentiDemo = [
  { id:1, nome:'Marco Conti', ruolo:'Dev Senior', email:'marco@azienda.it', tel:'+39 333 111222', sede:'Deposito Centrale', stato:'attivo', data_assunzione:'2023-01-15', stipendio:3800 },
  { id:2, nome:'Sara Ferri', ruolo:'Designer', email:'sara@azienda.it', tel:'+39 334 222333', sede:'Negozio Milano', stato:'attivo', data_assunzione:'2023-03-01', stipendio:3200 },
  { id:3, nome:'Luca Neri', ruolo:'Commesso', email:'luca@azienda.it', tel:'+39 335 333444', sede:'Negozio Milano', stato:'attivo', data_assunzione:'2024-06-01', stipendio:2400 },
  { id:4, nome:'Paolo Russo', ruolo:'Manager', email:'paolo@azienda.it', tel:'+39 336 444555', sede:'Negozio Roma', stato:'ferie', data_assunzione:'2022-09-01', stipendio:4100 },
]

const ferieDemo = [
  { id:1, dipendente:'Paolo Russo', tipo:'ferie', dal:'2026-04-15', al:'2026-04-25', stato:'approvata', giorni:10 },
  { id:2, dipendente:'Sara Ferri', tipo:'permesso', dal:'2026-04-20', al:'2026-04-20', stato:'in attesa', giorni:1 },
  { id:3, dipendente:'Luca Neri', tipo:'malattia', dal:'2026-04-18', al:'2026-04-19', stato:'approvata', giorni:2 },
]

export default function HRPage() {
  const [tab, setTab] = useState('dipendenti')
  const [dipendenti, setDipendenti] = useState(dipendentiDemo)
  const [ferie, setFerie] = useState(ferieDemo)
  const [mostraForm, setMostraForm] = useState(false)
  const [form, setForm] = useState({nome:'',ruolo:'',email:'',tel:'',sede:'',stipendio:'',data_assunzione:''})

  const salva = () => {
    if (!form.nome) return
    setDipendenti([...dipendenti, {...form, id:Date.now(), stato:'attivo', stipendio:parseFloat(form.stipendio)||0}])
    setMostraForm(false)
    setForm({nome:'',ruolo:'',email:'',tel:'',sede:'',stipendio:'',data_assunzione:''})
  }

  const approvaFerie = (id: number) => setFerie(ferie.map(f => f.id === id ? {...f, stato:'approvata'} : f))
  const rifiutaFerie = (id: number) => setFerie(ferie.map(f => f.id === id ? {...f, stato:'rifiutata'} : f))

  return (
    <div style={{fontFamily:'system-ui'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>HR — Risorse Umane</h1>
          <p style={{color:'#64748b',fontSize:'14px'}}>{dipendenti.length} dipendenti</p>
        </div>
        {tab==='dipendenti' && <button onClick={()=>setMostraForm(true)}
          style={{background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'10px 16px',fontWeight:'600',cursor:'pointer',fontSize:'14px'}}>
          + Nuovo Dipendente
        </button>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'11px'}}>Attivi</p>
          <p style={{fontSize:'22px',fontWeight:'700',color:'#22c55e'}}>{dipendenti.filter(d=>d.stato==='attivo').length}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'11px'}}>In ferie</p>
          <p style={{fontSize:'22px',fontWeight:'700',color:'#f59e0b'}}>{dipendenti.filter(d=>d.stato==='ferie').length}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'11px'}}>Richieste</p>
          <p style={{fontSize:'22px',fontWeight:'700',color:'#3b82f6'}}>{ferie.filter(f=>f.stato==='in attesa').length}</p>
        </div>
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {['dipendenti','ferie'].map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{background:tab===t?'#3b82f6':'white',color:tab===t?'white':'#64748b',border:'1px solid #e2e8f0',borderRadius:'99px',padding:'6px 16px',fontSize:'13px',cursor:'pointer',fontWeight:tab===t?'600':'400'}}>
            {t==='dipendenti'?'👥 Dipendenti':'🌴 Ferie & Permessi'}
          </button>
        ))}
      </div>

      {tab==='dipendenti' && (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {dipendenti.map(d => (
            <div key={d.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <div>
                  <p style={{fontWeight:'600',color:'#0f172a',fontSize:'15px'}}>{d.nome}</p>
                  <p style={{color:'#64748b',fontSize:'13px'}}>{d.ruolo} · {d.sede}</p>
                </div>
                <span style={{background:d.stato==='attivo'?'#dcfce7':d.stato==='ferie'?'#fef9c3':'#fee2e2',color:d.stato==='attivo'?'#166534':d.stato==='ferie'?'#854d0e':'#991b1b',padding:'3px 10px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>
                  {d.stato}
                </span>
              </div>
              <p style={{color:'#64748b',fontSize:'13px'}}>📧 {d.email}</p>
              <p style={{color:'#64748b',fontSize:'13px'}}>📞 {d.tel}</p>
              <p style={{color:'#3b82f6',fontWeight:'600',fontSize:'14px',marginTop:'8px'}}>💰 €{d.stipendio.toLocaleString('it-IT')}/mese</p>
            </div>
          ))}
        </div>
      )}

      {tab==='ferie' && (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {ferie.map(f => (
            <div key={f.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <p style={{fontWeight:'600',color:'#0f172a'}}>{f.dipendente}</p>
                <span style={{background:f.stato==='approvata'?'#dcfce7':f.stato==='in attesa'?'#fef9c3':'#fee2e2',color:f.stato==='approvata'?'#166534':f.stato==='in attesa'?'#854d0e':'#991b1b',padding:'3px 10px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>
                  {f.stato}
                </span>
              </div>
              <p style={{color:'#64748b',fontSize:'13px',marginBottom:'4px'}}>📅 {f.dal} → {f.al} ({f.giorni} giorni)</p>
              <p style={{color:'#64748b',fontSize:'13px',marginBottom:'12px'}}>Tipo: {f.tipo}</p>
              {f.stato==='in attesa' && (
                <div style={{display:'flex',gap:'8px'}}>
                  <button onClick={()=>approvaFerie(f.id)} style={{flex:1,background:'#dcfce7',color:'#166534',border:'none',borderRadius:'6px',padding:'8px',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>✅ Approva</button>
                  <button onClick={()=>rifiutaFerie(f.id)} style={{flex:1,background:'#fee2e2',color:'#991b1b',border:'none',borderRadius:'6px',padding:'8px',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>❌ Rifiuta</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mostraForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'16px 16px 0 0',padding:'24px',width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700'}}>Nuovo Dipendente</h2>
              <button onClick={()=>setMostraForm(false)} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>×</button>
            </div>
            {[
              {label:'Nome Cognome *',key:'nome',placeholder:'Mario Rossi'},
              {label:'Ruolo',key:'ruolo',placeholder:'Commesso'},
              {label:'Email',key:'email',placeholder:'mario@azienda.it'},
              {label:'Telefono',key:'tel',placeholder:'+39 333 1234567'},
              {label:'Sede',key:'sede',placeholder:'Negozio Milano'},
              {label:'Stipendio mensile (€)',key:'stipendio',placeholder:'2500'},
            ].map(f => (
              <div key={f.key} style={{marginBottom:'14px'}}>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>{f.label}</label>
                <input placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
              </div>
            ))}
            <button onClick={salva} style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              💾 Salva Dipendente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
