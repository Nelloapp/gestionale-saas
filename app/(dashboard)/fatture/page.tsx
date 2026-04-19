'use client'
import { useState } from 'react'

const fattureDemo = [
  { id:1, numero:'FAT-2026-001', cliente:'Rossi Group SRL', data:'2026-03-15', scadenza:'2026-04-15', totale:10370, stato:'pagata', tipo:'fattura' },
  { id:2, numero:'FAT-2026-002', cliente:'Bianchi SPA', data:'2026-04-01', scadenza:'2026-05-01', totale:5124, stato:'inviata', tipo:'fattura' },
  { id:3, numero:'FAT-2026-003', cliente:'Tech Solutions SRL', data:'2026-04-10', scadenza:'2026-05-10', totale:2562, stato:'scaduta', tipo:'fattura' },
  { id:4, numero:'PRE-2026-001', cliente:'Verde & Co SNC', data:'2026-04-15', scadenza:'2026-05-15', totale:4880, stato:'inviata', tipo:'preventivo' },
  { id:5, numero:'FAT-2026-004', cliente:'Mario Verdi', data:'2026-04-18', scadenza:'2026-05-18', totale:976, stato:'bozza', tipo:'fattura' },
]

const statoColori: any = {
  pagata: {bg:'#dcfce7',color:'#166534'},
  inviata: {bg:'#dbeafe',color:'#1e40af'},
  scaduta: {bg:'#fee2e2',color:'#991b1b'},
  bozza: {bg:'#f1f5f9',color:'#475569'},
}

export default function FatturePage() {
  const [fatture, setFatture] = useState(fattureDemo)
  const [cerca, setCerca] = useState('')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [mostraForm, setMostraForm] = useState(false)
  const [form, setForm] = useState({numero:'',cliente:'',data:'',scadenza:'',totale:'',stato:'bozza',tipo:'fattura'})

  const filtrate = fatture.filter(f => {
    const matchCerca = f.cliente.toLowerCase().includes(cerca.toLowerCase()) || f.numero.toLowerCase().includes(cerca.toLowerCase())
    const matchStato = filtroStato === 'tutti' || f.stato === filtroStato
    return matchCerca && matchStato
  })

  const salva = () => {
    if (!form.cliente || !form.numero) return
    setFatture([...fatture, {...form, id:Date.now(), totale:parseFloat(form.totale)||0}])
    setMostraForm(false)
    setForm({numero:'',cliente:'',data:'',scadenza:'',totale:'',stato:'bozza',tipo:'fattura'})
  }

  const cambiaStato = (id: number, stato: string) => {
    setFatture(fatture.map(f => f.id === id ? {...f, stato} : f))
  }

  const totalefatturato = fatture.filter(f=>f.stato==='pagata').reduce((s,f)=>s+f.totale,0)
  const totaleDaIncassare = fatture.filter(f=>f.stato==='inviata').reduce((s,f)=>s+f.totale,0)
  const totaleScadute = fatture.filter(f=>f.stato==='scaduta').reduce((s,f)=>s+f.totale,0)

  return (
    <div style={{fontFamily:'system-ui'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>Fatture</h1>
          <p style={{color:'#64748b',fontSize:'14px'}}>{fatture.length} documenti totali</p>
        </div>
        <button onClick={()=>setMostraForm(true)}
          style={{background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'10px 16px',fontWeight:'600',cursor:'pointer',fontSize:'14px'}}>
          + Nuova Fattura
        </button>
      </div>

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',gridColumn:'span 2'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>💰 Incassato</p>
          <p style={{fontSize:'24px',fontWeight:'700',color:'#22c55e'}}>€{totalefatturato.toLocaleString('it-IT')}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>📤 Da incassare</p>
          <p style={{fontSize:'20px',fontWeight:'700',color:'#3b82f6'}}>€{totaleDaIncassare.toLocaleString('it-IT')}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>⚠️ Scadute</p>
          <p style={{fontSize:'20px',fontWeight:'700',color:'#ef4444'}}>€{totaleScadute.toLocaleString('it-IT')}</p>
        </div>
      </div>

      {/* Cerca */}
      <input value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="🔍 Cerca per cliente o numero..."
        style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',marginBottom:'12px',background:'white',outline:'none'}}/>

      {/* Filtro stato */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px',overflowX:'auto',paddingBottom:'4px'}}>
        {['tutti','bozza','inviata','pagata','scaduta'].map(s => (
          <button key={s} onClick={()=>setFiltroStato(s)}
            style={{background: filtroStato===s ? '#3b82f6' : 'white', color: filtroStato===s ? 'white' : '#64748b',
              border:'1px solid #e2e8f0',borderRadius:'99px',padding:'6px 14px',fontSize:'13px',cursor:'pointer',whiteSpace:'nowrap',fontWeight: filtroStato===s ? '600' : '400'}}>
            {s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {filtrate.map(f => (
          <div key={f.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
              <div>
                <p style={{fontWeight:'600',color:'#0f172a',fontSize:'15px'}}>{f.numero}</p>
                <p style={{color:'#64748b',fontSize:'13px'}}>{f.cliente}</p>
              </div>
              <span style={{background:statoColori[f.stato]?.bg,color:statoColori[f.stato]?.color,padding:'3px 10px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>
                {f.stato}
              </span>
            </div>
            <p style={{fontSize:'22px',fontWeight:'700',color:'#0f172a',marginBottom:'8px'}}>€{f.totale.toLocaleString('it-IT')}</p>
            <div style={{display:'flex',gap:'12px',marginBottom:'12px'}}>
              <p style={{color:'#64748b',fontSize:'12px'}}>📅 {f.data}</p>
              <p style={{color:'#64748b',fontSize:'12px'}}>⏰ Scade: {f.scadenza}</p>
            </div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {f.stato === 'bozza' && <button onClick={()=>cambiaStato(f.id,'inviata')} style={{flex:1,background:'#dbeafe',color:'#1e40af',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer'}}>📤 Invia</button>}
              {f.stato === 'inviata' && <button onClick={()=>cambiaStato(f.id,'pagata')} style={{flex:1,background:'#dcfce7',color:'#166534',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer'}}>✅ Segna Pagata</button>}
              {f.stato === 'scaduta' && <button onClick={()=>cambiaStato(f.id,'pagata')} style={{flex:1,background:'#dcfce7',color:'#166534',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer'}}>✅ Pagata</button>}
              <button style={{flex:1,background:'#f1f5f9',color:'#374151',border:'none',borderRadius:'6px',padding:'7px',fontSize:'12px',cursor:'pointer'}}>📄 PDF</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {mostraForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'16px 16px 0 0',padding:'24px',width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700'}}>Nuova Fattura</h2>
              <button onClick={()=>setMostraForm(false)} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>×</button>
            </div>
            {[
              {label:'Numero *',key:'numero',type:'text',placeholder:'FAT-2026-005'},
              {label:'Cliente *',key:'cliente',type:'text',placeholder:'Nome cliente'},
              {label:'Data',key:'data',type:'date',placeholder:''},
              {label:'Scadenza',key:'scadenza',type:'date',placeholder:''},
              {label:'Totale (€)',key:'totale',type:'number',placeholder:'0.00'},
            ].map(f => (
              <div key={f.key} style={{marginBottom:'14px'}}>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500',color:'#374151'}}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>Tipo</label>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                  <option value="fattura">Fattura</option>
                  <option value="preventivo">Preventivo</option>
                  <option value="nota_credito">Nota Credito</option>
                </select>
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>Stato</label>
                <select value={form.stato} onChange={e=>setForm({...form,stato:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                  <option value="bozza">Bozza</option>
                  <option value="inviata">Inviata</option>
                  <option value="pagata">Pagata</option>
                </select>
              </div>
            </div>
            <button onClick={salva}
              style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              💾 Salva Fattura
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
