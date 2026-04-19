'use client'
import { useState } from 'react'

const sediDemo = [
  { id:1, nome:'Deposito Centrale', tipo:'deposito' },
  { id:2, nome:'Negozio Milano', tipo:'negozio' },
  { id:3, nome:'Negozio Roma', tipo:'negozio' },
]

const stockDemo = [
  { id:1, articolo:'T-Shirt Cotone', codice:'ART001', sede_id:1, sede:'Deposito Centrale', quantita:100, minimo:20 },
  { id:2, articolo:'T-Shirt Cotone', codice:'ART001', sede_id:2, sede:'Negozio Milano', quantita:30, minimo:10 },
  { id:3, articolo:'T-Shirt Cotone', codice:'ART001', sede_id:3, sede:'Negozio Roma', quantita:20, minimo:10 },
  { id:4, articolo:'Jeans Slim Fit', codice:'ART002', sede_id:1, sede:'Deposito Centrale', quantita:60, minimo:15 },
  { id:5, articolo:'Jeans Slim Fit', codice:'ART002', sede_id:2, sede:'Negozio Milano', quantita:12, minimo:5 },
  { id:6, articolo:'Scarpe Sneakers', codice:'ART003', sede_id:1, sede:'Deposito Centrale', quantita:5, minimo:10 },
  { id:7, articolo:'Borsa Pelle', codice:'ART004', sede_id:2, sede:'Negozio Milano', quantita:0, minimo:5 },
]

const movimentiDemo = [
  { id:1, tipo:'trasferimento', articolo:'T-Shirt Cotone', da:'Deposito Centrale', a:'Negozio Milano', quantita:10, data:'2026-04-18', note:'Rifornimento settimanale' },
  { id:2, tipo:'carico', articolo:'Jeans Slim Fit', da:'-', a:'Deposito Centrale', quantita:50, data:'2026-04-17', note:'Arrivo merce fornitore' },
  { id:3, tipo:'scarico', articolo:'Borsa Pelle', da:'Negozio Milano', a:'-', quantita:2, data:'2026-04-16', note:'Vendita' },
]

export default function MagazzinoPage() {
  const [stock, setStock] = useState(stockDemo)
  const [movimenti, setMovimenti] = useState(movimentiDemo)
  const [tab, setTab] = useState('stock')
  const [sedeFiltro, setSedeFiltro] = useState(0)
  const [cerca, setCerca] = useState('')
  const [mostraTrasf, setMostraTrasf] = useState(false)
  const [trasf, setTrasf] = useState({articolo:'',da:'',a:'',quantita:'',note:''})

  const stockFiltrato = stock.filter(s => {
    const matchSede = sedeFiltro === 0 || s.sede_id === sedeFiltro
    const matchCerca = s.articolo.toLowerCase().includes(cerca.toLowerCase()) || s.codice.toLowerCase().includes(cerca.toLowerCase())
    return matchSede && matchCerca
  })

  const eseguiTrasferimento = () => {
    if (!trasf.articolo || !trasf.da || !trasf.a || !trasf.quantita) return
    const qty = parseInt(trasf.quantita)
    setStock(stock.map(s => {
      if (s.articolo === trasf.articolo && s.sede === trasf.da) return {...s, quantita: s.quantita - qty}
      if (s.articolo === trasf.articolo && s.sede === trasf.a) return {...s, quantita: s.quantita + qty}
      return s
    }))
    setMovimenti([{id:Date.now(),tipo:'trasferimento',articolo:trasf.articolo,da:trasf.da,a:trasf.a,quantita:qty,data:new Date().toISOString().split('T')[0],note:trasf.note}, ...movimenti])
    setMostraTrasf(false)
    setTrasf({articolo:'',da:'',a:'',quantita:'',note:''})
  }

  const stockColor = (q: number, m: number) => q === 0 ? '#ef4444' : q < m ? '#f59e0b' : '#22c55e'
  const articoliUnici = [...new Set(stock.map(s => s.articolo))]

  return (
    <div style={{fontFamily:'system-ui'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>Magazzino</h1>
          <p style={{color:'#64748b',fontSize:'14px'}}>{sediDemo.length} sedi · {articoliUnici.length} articoli</p>
        </div>
        <button onClick={()=>setMostraTrasf(true)}
          style={{background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'10px 16px',fontWeight:'600',cursor:'pointer',fontSize:'14px'}}>
          🔄 Trasferimento
        </button>
      </div>

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'20px'}}>
        {sediDemo.map(s => (
          <div key={s.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <p style={{color:'#64748b',fontSize:'11px'}}>{s.tipo==='deposito'?'🏭':'🏪'} {s.nome}</p>
            <p style={{fontSize:'22px',fontWeight:'700',color:'#0f172a'}}>{stock.filter(st=>st.sede_id===s.id).reduce((sum,st)=>sum+st.quantita,0)}</p>
            <p style={{color:'#64748b',fontSize:'11px'}}>pezzi totali</p>
          </div>
        ))}
      </div>

      {/* Tab */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {['stock','movimenti'].map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{background:tab===t?'#3b82f6':'white',color:tab===t?'white':'#64748b',border:'1px solid #e2e8f0',borderRadius:'99px',padding:'6px 16px',fontSize:'13px',cursor:'pointer',fontWeight:tab===t?'600':'400'}}>
            {t === 'stock' ? '📦 Stock' : '📋 Movimenti'}
          </button>
        ))}
      </div>

      {tab === 'stock' && <>
        <input value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="🔍 Cerca articolo..."
          style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',marginBottom:'12px',background:'white',outline:'none'}}/>
        <div style={{display:'flex',gap:'8px',marginBottom:'16px',overflowX:'auto'}}>
          <button onClick={()=>setSedeFiltro(0)} style={{background:sedeFiltro===0?'#3b82f6':'white',color:sedeFiltro===0?'white':'#64748b',border:'1px solid #e2e8f0',borderRadius:'99px',padding:'6px 14px',fontSize:'13px',cursor:'pointer',whiteSpace:'nowrap'}}>Tutte</button>
          {sediDemo.map(s => (
            <button key={s.id} onClick={()=>setSedeFiltro(s.id)} style={{background:sedeFiltro===s.id?'#3b82f6':'white',color:sedeFiltro===s.id?'white':'#64748b',border:'1px solid #e2e8f0',borderRadius:'99px',padding:'6px 14px',fontSize:'13px',cursor:'pointer',whiteSpace:'nowrap'}}>
              {s.nome}
            </button>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {stockFiltrato.map(s => (
            <div key={s.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                <div>
                  <p style={{fontWeight:'600',color:'#0f172a',fontSize:'15px'}}>{s.articolo}</p>
                  <p style={{color:'#64748b',fontSize:'12px'}}>📦 {s.codice} · {s.sede}</p>
                </div>
                <span style={{background: s.quantita===0?'#fee2e2':s.quantita<s.minimo?'#fef9c3':'#dcfce7', color:stockColor(s.quantita,s.minimo), padding:'3px 10px',borderRadius:'99px',fontSize:'13px',fontWeight:'700'}}>
                  {s.quantita} pz
                </span>
              </div>
              <div style={{background:'#f8fafc',borderRadius:'8px',padding:'8px 12px',display:'flex',justifyContent:'space-between'}}>
                <p style={{color:'#64748b',fontSize:'12px'}}>Minimo: {s.minimo} pz</p>
                {s.quantita < s.minimo && <p style={{color:'#f59e0b',fontSize:'12px',fontWeight:'600'}}>⚠️ Sotto soglia</p>}
                {s.quantita === 0 && <p style={{color:'#ef4444',fontSize:'12px',fontWeight:'600'}}>🔴 Esaurito</p>}
              </div>
            </div>
          ))}
        </div>
      </>}

      {tab === 'movimenti' && (
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {movimenti.map(m => (
            <div key={m.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                <p style={{fontWeight:'600',color:'#0f172a',fontSize:'14px'}}>{m.articolo}</p>
                <span style={{background: m.tipo==='carico'?'#dcfce7':m.tipo==='scarico'?'#fee2e2':'#dbeafe', color:m.tipo==='carico'?'#166534':m.tipo==='scarico'?'#991b1b':'#1e40af', padding:'2px 8px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>
                  {m.tipo}
                </span>
              </div>
              <p style={{color:'#64748b',fontSize:'13px',marginBottom:'4px'}}>📤 {m.da} → 📥 {m.a}</p>
              <p style={{color:'#0f172a',fontSize:'14px',fontWeight:'600',marginBottom:'4px'}}>Quantità: {m.quantita} pz</p>
              <p style={{color:'#64748b',fontSize:'12px'}}>{m.data} · {m.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form Trasferimento */}
      {mostraTrasf && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'16px 16px 0 0',padding:'24px',width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700'}}>🔄 Nuovo Trasferimento</h2>
              <button onClick={()=>setMostraTrasf(false)} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>×</button>
            </div>
            <div style={{marginBottom:'14px'}}>
              <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>Articolo</label>
              <select value={trasf.articolo} onChange={e=>setTrasf({...trasf,articolo:e.target.value})}
                style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                <option value="">Seleziona articolo</option>
                {articoliUnici.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>Da</label>
                <select value={trasf.da} onChange={e=>setTrasf({...trasf,da:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                  <option value="">Sede origine</option>
                  {sediDemo.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>A</label>
                <select value={trasf.a} onChange={e=>setTrasf({...trasf,a:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                  <option value="">Sede destinazione</option>
                  {sediDemo.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:'14px'}}>
              <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>Quantità</label>
              <input type="number" placeholder="0" value={trasf.quantita} onChange={e=>setTrasf({...trasf,quantita:e.target.value})}
                style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>Note</label>
              <input type="text" placeholder="Es. Rifornimento settimanale" value={trasf.note} onChange={e=>setTrasf({...trasf,note:e.target.value})}
                style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
            </div>
            <button onClick={eseguiTrasferimento}
              style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              🔄 Esegui Trasferimento
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
