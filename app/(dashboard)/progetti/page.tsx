'use client'
import { useState } from 'react'

const progettiDemo = [
  { id:1, nome:'App Mobile Rossi', cliente:'Rossi Group SRL', budget:25000, speso:18000, avanzamento:72, stato:'in corso', scadenza:'2026-06-30', colore:'#3b82f6' },
  { id:2, nome:'Rebranding Bianchi', cliente:'Bianchi SPA', budget:12000, speso:12000, avanzamento:100, stato:'completato', scadenza:'2026-03-31', colore:'#22c55e' },
  { id:3, nome:'E-commerce Verde', cliente:'Verde & Co SNC', budget:8000, speso:1200, avanzamento:15, stato:'in corso', scadenza:'2026-07-31', colore:'#f59e0b' },
]

const taskDemo = [
  { id:1, progetto_id:1, titolo:'Design UI', stato:'completato', priorita:'alta', scadenza:'2026-04-01' },
  { id:2, progetto_id:1, titolo:'Sviluppo Backend', stato:'in corso', priorita:'alta', scadenza:'2026-05-15' },
  { id:3, progetto_id:1, titolo:'Testing', stato:'da fare', priorita:'normale', scadenza:'2026-06-15' },
  { id:4, progetto_id:3, titolo:'Analisi requisiti', stato:'completato', priorita:'alta', scadenza:'2026-04-10' },
  { id:5, progetto_id:3, titolo:'Sviluppo frontend', stato:'in corso', priorita:'normale', scadenza:'2026-06-30' },
]

export default function ProgettiPage() {
  const [progetti, setProgetti] = useState(progettiDemo)
  const [tasks, setTasks] = useState(taskDemo)
  const [progettoAperto, setProgettoAperto] = useState<any>(null)
  const [mostraForm, setMostraForm] = useState(false)
  const [form, setForm] = useState({nome:'',cliente:'',budget:'',scadenza:'',stato:'in corso'})

  const salva = () => {
    if (!form.nome) return
    setProgetti([...progetti, {...form, id:Date.now(), speso:0, avanzamento:0, budget:parseFloat(form.budget)||0, colore:'#8b5cf6'}])
    setMostraForm(false)
    setForm({nome:'',cliente:'',budget:'',scadenza:'',stato:'in corso'})
  }

  const cambiaTaskStato = (id: number, stato: string) => setTasks(tasks.map(t => t.id === id ? {...t, stato} : t))

  const taskProgetto = progettoAperto ? tasks.filter(t => t.progetto_id === progettoAperto.id) : []

  const prioritaColore: any = { alta:'#ef4444', normale:'#f59e0b', bassa:'#22c55e' }
  const taskStatoBg: any = { 'completato':'#dcfce7', 'in corso':'#dbeafe', 'da fare':'#f1f5f9' }
  const taskStatoColor: any = { 'completato':'#166534', 'in corso':'#1e40af', 'da fare':'#475569' }

  if (progettoAperto) return (
    <div style={{fontFamily:'system-ui'}}>
      <button onClick={()=>setProgettoAperto(null)} style={{background:'none',border:'none',color:'#3b82f6',fontSize:'14px',cursor:'pointer',marginBottom:'16px',padding:'0'}}>
        ← Torna ai progetti
      </button>
      <h1 style={{fontSize:'22px',fontWeight:'700',color:'#0f172a',marginBottom:'4px'}}>{progettoAperto.nome}</h1>
      <p style={{color:'#64748b',fontSize:'14px',marginBottom:'20px'}}>{progettoAperto.cliente}</p>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>Budget</p>
          <p style={{fontSize:'20px',fontWeight:'700',color:'#0f172a'}}>€{progettoAperto.budget.toLocaleString('it-IT')}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>Speso</p>
          <p style={{fontSize:'20px',fontWeight:'700',color: progettoAperto.speso > progettoAperto.budget ? '#ef4444' : '#0f172a'}}>€{progettoAperto.speso.toLocaleString('it-IT')}</p>
        </div>
      </div>

      <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:'20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
          <p style={{fontWeight:'600'}}>Avanzamento</p>
          <p style={{fontWeight:'700',color:progettoAperto.colore}}>{progettoAperto.avanzamento}%</p>
        </div>
        <div style={{background:'#f1f5f9',borderRadius:'99px',height:'10px'}}>
          <div style={{background:progettoAperto.colore,borderRadius:'99px',height:'10px',width:`${progettoAperto.avanzamento}%`,transition:'width 0.3s'}}/>
        </div>
      </div>

      <h3 style={{fontSize:'16px',fontWeight:'700',marginBottom:'12px'}}>📋 Task ({taskProgetto.length})</h3>
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {taskProgetto.map(t => (
          <div key={t.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <p style={{fontWeight:'600',color:'#0f172a'}}>{t.titolo}</p>
              <span style={{background:taskStatoBg[t.stato],color:taskStatoColor[t.stato],padding:'2px 8px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>{t.stato}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'12px'}}>
              <span style={{background:'#f1f5f9',color:prioritaColore[t.priorita],padding:'2px 8px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>● {t.priorita}</span>
              <p style={{color:'#64748b',fontSize:'12px'}}>📅 {t.scadenza}</p>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              {t.stato!=='da fare' && <button onClick={()=>cambiaTaskStato(t.id,'da fare')} style={{flex:1,background:'#f1f5f9',color:'#475569',border:'none',borderRadius:'6px',padding:'6px',fontSize:'12px',cursor:'pointer'}}>Da fare</button>}
              {t.stato!=='in corso' && <button onClick={()=>cambiaTaskStato(t.id,'in corso')} style={{flex:1,background:'#dbeafe',color:'#1e40af',border:'none',borderRadius:'6px',padding:'6px',fontSize:'12px',cursor:'pointer'}}>In corso</button>}
              {t.stato!=='completato' && <button onClick={()=>cambiaTaskStato(t.id,'completato')} style={{flex:1,background:'#dcfce7',color:'#166534',border:'none',borderRadius:'6px',padding:'6px',fontSize:'12px',cursor:'pointer'}}>✅ Fatto</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:'system-ui'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>Progetti</h1>
          <p style={{color:'#64748b',fontSize:'14px'}}>{progetti.length} progetti</p>
        </div>
        <button onClick={()=>setMostraForm(true)} style={{background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'10px 16px',fontWeight:'600',cursor:'pointer',fontSize:'14px'}}>
          + Nuovo Progetto
        </button>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
        {progetti.map(p => (
          <div key={p.id} onClick={()=>setProgettoAperto(p)} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',cursor:'pointer',borderLeft:`4px solid ${p.colore}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <div>
                <p style={{fontWeight:'700',color:'#0f172a',fontSize:'15px'}}>{p.nome}</p>
                <p style={{color:'#64748b',fontSize:'13px'}}>{p.cliente}</p>
              </div>
              <span style={{background:p.stato==='completato'?'#dcfce7':'#dbeafe',color:p.stato==='completato'?'#166534':'#1e40af',padding:'3px 10px',borderRadius:'99px',fontSize:'11px',fontWeight:'600',height:'fit-content'}}>
                {p.stato}
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <p style={{color:'#64748b',fontSize:'13px'}}>Budget: €{p.budget.toLocaleString('it-IT')}</p>
              <p style={{color:'#64748b',fontSize:'13px'}}>📅 {p.scadenza}</p>
            </div>
            <div style={{background:'#f1f5f9',borderRadius:'99px',height:'8px'}}>
              <div style={{background:p.colore,borderRadius:'99px',height:'8px',width:`${p.avanzamento}%`}}/>
            </div>
            <p style={{color:p.colore,fontSize:'12px',fontWeight:'600',marginTop:'4px',textAlign:'right'}}>{p.avanzamento}%</p>
          </div>
        ))}
      </div>

      {mostraForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'16px 16px 0 0',padding:'24px',width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700'}}>Nuovo Progetto</h2>
              <button onClick={()=>setMostraForm(false)} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>×</button>
            </div>
            {[
              {label:'Nome Progetto *',key:'nome',placeholder:'Es. App Mobile'},
              {label:'Cliente',key:'cliente',placeholder:'Nome cliente'},
              {label:'Budget (€)',key:'budget',placeholder:'10000'},
              {label:'Scadenza',key:'scadenza',placeholder:'2026-12-31'},
            ].map(f => (
              <div key={f.key} style={{marginBottom:'14px'}}>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>{f.label}</label>
                <input placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
              </div>
            ))}
            <button onClick={salva} style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              💾 Salva Progetto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
