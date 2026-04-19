'use client'
import { useState } from 'react'

const articoliDemo = [
  { id:1, codice:'ART001', nome:'T-Shirt Cotone', categoria:'Abbigliamento', prezzo:25.00, prezzo_acquisto:8.00, iva:22, unita:'pz', stock:150, stato:'attivo' },
  { id:2, codice:'ART002', nome:'Jeans Slim Fit', categoria:'Abbigliamento', prezzo:59.90, prezzo_acquisto:18.00, iva:22, unita:'pz', stock:80, stato:'attivo' },
  { id:3, codice:'ART003', nome:'Scarpe Sneakers', categoria:'Calzature', prezzo:89.00, prezzo_acquisto:25.00, iva:22, unita:'pz', stock:5, stato:'attivo' },
  { id:4, codice:'ART004', nome:'Borsa Pelle', categoria:'Accessori', prezzo:129.00, prezzo_acquisto:40.00, iva:22, unita:'pz', stock:0, stato:'attivo' },
  { id:5, codice:'SRV001', nome:'Consulenza Oraria', categoria:'Servizi', prezzo:80.00, prezzo_acquisto:0, iva:22, unita:'ora', stock:999, stato:'attivo' },
]

export default function ArticoliPage() {
  const [articoli, setArticoli] = useState(articoliDemo)
  const [cerca, setCerca] = useState('')
  const [mostraForm, setMostraForm] = useState(false)
  const [selezionato, setSelezionato] = useState<any>(null)
  const [form, setForm] = useState({codice:'',nome:'',categoria:'',prezzo:'',prezzo_acquisto:'',iva:'22',unita:'pz',stato:'attivo'})

  const filtrati = articoli.filter(a =>
    a.nome.toLowerCase().includes(cerca.toLowerCase()) ||
    a.codice.toLowerCase().includes(cerca.toLowerCase()) ||
    a.categoria.toLowerCase().includes(cerca.toLowerCase())
  )

  const salva = () => {
    if (!form.nome) return
    if (selezionato) {
      setArticoli(articoli.map(a => a.id === selezionato.id ? {...a,...form, prezzo:parseFloat(form.prezzo)||0, prezzo_acquisto:parseFloat(form.prezzo_acquisto)||0, iva:parseInt(form.iva)||22} : a))
    } else {
      setArticoli([...articoli, {...form, id:Date.now(), prezzo:parseFloat(form.prezzo)||0, prezzo_acquisto:parseFloat(form.prezzo_acquisto)||0, iva:parseInt(form.iva)||22, stock:0}])
    }
    setMostraForm(false)
    setSelezionato(null)
    setForm({codice:'',nome:'',categoria:'',prezzo:'',prezzo_acquisto:'',iva:'22',unita:'pz',stato:'attivo'})
  }

  const modifica = (a: any) => {
    setSelezionato(a)
    setForm({codice:a.codice,nome:a.nome,categoria:a.categoria,prezzo:a.prezzo.toString(),prezzo_acquisto:a.prezzo_acquisto.toString(),iva:a.iva.toString(),unita:a.unita,stato:a.stato})
    setMostraForm(true)
  }

  const elimina = (id: number) => {
    if (confirm('Eliminare questo articolo?')) setArticoli(articoli.filter(a => a.id !== id))
  }

  const stockColor = (s: number) => s === 0 ? '#ef4444' : s < 10 ? '#f59e0b' : '#22c55e'

  return (
    <div style={{fontFamily:'system-ui'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>Articoli</h1>
          <p style={{color:'#64748b',fontSize:'14px'}}>{articoli.length} articoli totali</p>
        </div>
        <button onClick={()=>{setMostraForm(true);setSelezionato(null);setForm({codice:'',nome:'',categoria:'',prezzo:'',prezzo_acquisto:'',iva:'22',unita:'pz',stato:'attivo'})}}
          style={{background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'10px 16px',fontWeight:'600',cursor:'pointer',fontSize:'14px'}}>
          + Nuovo Articolo
        </button>
      </div>

      <input value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="🔍 Cerca per nome, codice, categoria..."
        style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',marginBottom:'16px',background:'white',outline:'none'}}/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>Totale</p>
          <p style={{fontSize:'22px',fontWeight:'700',color:'#0f172a'}}>{articoli.length}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>Esauriti</p>
          <p style={{fontSize:'22px',fontWeight:'700',color:'#ef4444'}}>{articoli.filter(a=>a.stock===0).length}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>Sotto soglia</p>
          <p style={{fontSize:'22px',fontWeight:'700',color:'#f59e0b'}}>{articoli.filter(a=>a.stock>0&&a.stock<10).length}</p>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {filtrati.map(a => (
          <div key={a.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
              <div>
                <p style={{fontWeight:'600',color:'#0f172a',fontSize:'15px'}}>{a.nome}</p>
                <p style={{color:'#64748b',fontSize:'12px'}}>📦 {a.codice} · {a.categoria}</p>
              </div>
              <span style={{background: a.stock===0?'#fee2e2':a.stock<10?'#fef9c3':'#dcfce7', color:stockColor(a.stock), padding:'2px 8px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>
                {a.stock===0?'Esaurito':a.stock<10?`⚠️ ${a.stock} pz`:`${a.stock} pz`}
              </span>
            </div>
            <div style={{display:'flex',gap:'16px',marginBottom:'12px'}}>
              <p style={{color:'#3b82f6',fontWeight:'700',fontSize:'16px'}}>€{a.prezzo.toFixed(2)}</p>
              <p style={{color:'#64748b',fontSize:'13px'}}>Acquisto: €{a.prezzo_acquisto.toFixed(2)}</p>
              <p style={{color:'#64748b',fontSize:'13px'}}>IVA {a.iva}%</p>
            </div>
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>modifica(a)} style={{flex:1,background:'#f1f5f9',color:'#374151',border:'none',borderRadius:'6px',padding:'7px',fontSize:'13px',cursor:'pointer'}}>✏️ Modifica</button>
              <button onClick={()=>elimina(a.id)} style={{flex:1,background:'#fee2e2',color:'#991b1b',border:'none',borderRadius:'6px',padding:'7px',fontSize:'13px',cursor:'pointer'}}>🗑️ Elimina</button>
            </div>
          </div>
        ))}
      </div>

      {mostraForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'16px 16px 0 0',padding:'24px',width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700'}}>{selezionato?'Modifica Articolo':'Nuovo Articolo'}</h2>
              <button onClick={()=>setMostraForm(false)} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>×</button>
            </div>
            {[
              {label:'Nome Articolo *',key:'nome',type:'text',placeholder:'Es. T-Shirt Cotone'},
              {label:'Codice',key:'codice',type:'text',placeholder:'ART001'},
              {label:'Categoria',key:'categoria',type:'text',placeholder:'Abbigliamento'},
              {label:'Prezzo Vendita (€)',key:'prezzo',type:'number',placeholder:'0.00'},
              {label:'Prezzo Acquisto (€)',key:'prezzo_acquisto',type:'number',placeholder:'0.00'},
            ].map(f => (
              <div key={f.key} style={{marginBottom:'14px'}}>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500',color:'#374151'}}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>IVA %</label>
                <select value={form.iva} onChange={e=>setForm({...form,iva:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                  <option value="22">22%</option>
                  <option value="10">10%</option>
                  <option value="4">4%</option>
                  <option value="0">Esente</option>
                </select>
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500'}}>Unità</label>
                <select value={form.unita} onChange={e=>setForm({...form,unita:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                  <option value="pz">Pezzo</option>
                  <option value="kg">Kg</option>
                  <option value="lt">Litro</option>
                  <option value="mt">Metro</option>
                  <option value="ora">Ora</option>
                </select>
              </div>
            </div>
            <button onClick={salva}
              style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              💾 Salva Articolo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
