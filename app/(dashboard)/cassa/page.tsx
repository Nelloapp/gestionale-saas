'use client'
import { useState } from 'react'

const prodottiCassa = [
  { id:1, nome:'T-Shirt Cotone', prezzo:25.00, categoria:'Abbigliamento' },
  { id:2, nome:'Jeans Slim Fit', prezzo:59.90, categoria:'Abbigliamento' },
  { id:3, nome:'Scarpe Sneakers', prezzo:89.00, categoria:'Calzature' },
  { id:4, nome:'Borsa Pelle', prezzo:129.00, categoria:'Accessori' },
  { id:5, nome:'Cintura Pelle', prezzo:35.00, categoria:'Accessori' },
  { id:6, nome:'Cappello', prezzo:19.90, categoria:'Abbigliamento' },
]

export default function CassaPage() {
  const [carrello, setCarrello] = useState<any[]>([])
  const [categoria, setCategoria] = useState('Tutti')
  const [cerca, setCerca] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [contanti, setContanti] = useState('')
  const [ricevuta, setRicevuta] = useState<any>(null)
  const [sconto, setSconto] = useState('')

  const categorie: string[] = ["Tutti", ...new Set(prodottiCassa.map(p => p.categoria))]
  const prodottiFiltrati = prodottiCassa.filter(p => {
    const matchCat = categoria === 'Tutti' || p.categoria === categoria
    const matchCerca = p.nome.toLowerCase().includes(cerca.toLowerCase())
    return matchCat && matchCerca
  })

  const aggiungi = (p: any) => {
    const esiste = carrello.find(c => c.id === p.id)
    if (esiste) setCarrello(carrello.map(c => c.id === p.id ? {...c, qty: c.qty+1} : c))
    else setCarrello([...carrello, {...p, qty:1}])
  }

  const rimuovi = (id: number) => setCarrello(carrello.filter(c => c.id !== id))
  const cambiaQty = (id: number, qty: number) => {
    if (qty <= 0) rimuovi(id)
    else setCarrello(carrello.map(c => c.id === id ? {...c, qty} : c))
  }

  const subtotale = carrello.reduce((s,c) => s + c.prezzo * c.qty, 0)
  const scontoVal = parseFloat(sconto) || 0
  const totale = Math.max(0, subtotale - scontoVal)
  const iva = totale - totale / 1.22
  const resto = parseFloat(contanti) - totale

  const completaVendita = () => {
    if (!pagamento || carrello.length === 0) return
    setRicevuta({ items: [...carrello], totale, pagamento, data: new Date().toLocaleString('it-IT') })
    setCarrello([])
    setSconto('')
    setContanti('')
    setPagamento('')
  }

  if (ricevuta) return (
    <div style={{fontFamily:'system-ui',maxWidth:'400px',margin:'0 auto',padding:'24px'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'24px',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',textAlign:'center'}}>
        <p style={{fontSize:'48px',marginBottom:'8px'}}>✅</p>
        <h2 style={{fontSize:'20px',fontWeight:'700',marginBottom:'4px'}}>Vendita Completata!</h2>
        <p style={{color:'#64748b',fontSize:'14px',marginBottom:'24px'}}>{ricevuta.data}</p>
        <div style={{textAlign:'left',marginBottom:'20px'}}>
          {ricevuta.items.map((i:any) => (
            <div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'14px'}}>{i.nome} x{i.qty}</p>
              <p style={{fontSize:'14px',fontWeight:'600'}}>€{(i.prezzo*i.qty).toFixed(2)}</p>
            </div>
          ))}
        </div>
        <div style={{background:'#f8fafc',borderRadius:'8px',padding:'16px',marginBottom:'20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
            <p style={{fontSize:'14px',color:'#64748b'}}>Pagamento</p>
            <p style={{fontSize:'14px',fontWeight:'600'}}>{ricevuta.pagamento}</p>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <p style={{fontSize:'16px',fontWeight:'700'}}>TOTALE</p>
            <p style={{fontSize:'16px',fontWeight:'700',color:'#3b82f6'}}>€{ricevuta.totale.toFixed(2)}</p>
          </div>
        </div>
        <button onClick={()=>setRicevuta(null)}
          style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
          🆕 Nuova Vendita
        </button>
      </div>
    </div>
  )

  return (
    <div style={{fontFamily:'system-ui'}}>
      <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a',marginBottom:'20px'}}>🖥️ Cassa</h1>

      {/* Cerca */}
      <input value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="🔍 Cerca prodotto o scannerizza barcode..."
        style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',marginBottom:'12px',background:'white',outline:'none'}}/>

      {/* Categorie */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px',overflowX:'auto',paddingBottom:'4px'}}>
        {categorie.map(c => (
          <button key={c} onClick={()=>setCategoria(c)}
            style={{background:categoria===c?'#1e293b':'white',color:categoria===c?'white':'#64748b',border:'1px solid #e2e8f0',borderRadius:'99px',padding:'6px 14px',fontSize:'13px',cursor:'pointer',whiteSpace:'nowrap',fontWeight:categoria===c?'600':'400'}}>
            {c}
          </button>
        ))}
      </div>

      {/* Prodotti */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'20px'}}>
        {prodottiFiltrati.map(p => (
          <button key={p.id} onClick={()=>aggiungi(p)}
            style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'12px',padding:'16px',cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
            <p style={{fontWeight:'600',color:'#0f172a',fontSize:'14px',marginBottom:'4px'}}>{p.nome}</p>
            <p style={{color:'#3b82f6',fontWeight:'700',fontSize:'18px'}}>€{p.prezzo.toFixed(2)}</p>
          </button>
        ))}
      </div>

      {/* Carrello */}
      {carrello.length > 0 && (
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:'16px'}}>
          <h3 style={{fontSize:'16px',fontWeight:'700',marginBottom:'12px'}}>🛒 Carrello</h3>
          {carrello.map(c => (
            <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #f1f5f9'}}>
              <p style={{fontSize:'14px',flex:1}}>{c.nome}</p>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button onClick={()=>cambiaQty(c.id,c.qty-1)} style={{background:'#f1f5f9',border:'none',borderRadius:'4px',width:'28px',height:'28px',cursor:'pointer',fontSize:'16px'}}>-</button>
                <span style={{fontWeight:'600',minWidth:'20px',textAlign:'center'}}>{c.qty}</span>
                <button onClick={()=>cambiaQty(c.id,c.qty+1)} style={{background:'#f1f5f9',border:'none',borderRadius:'4px',width:'28px',height:'28px',cursor:'pointer',fontSize:'16px'}}>+</button>
                <p style={{fontWeight:'700',minWidth:'60px',textAlign:'right'}}>€{(c.prezzo*c.qty).toFixed(2)}</p>
                <button onClick={()=>rimuovi(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:'18px'}}>×</button>
              </div>
            </div>
          ))}

          <div style={{marginTop:'12px'}}>
            <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
              <label style={{fontSize:'13px',color:'#64748b',minWidth:'60px'}}>Sconto €</label>
              <input type="number" placeholder="0.00" value={sconto} onChange={e=>setSconto(e.target.value)}
                style={{flex:1,border:'1px solid #e2e8f0',borderRadius:'8px',padding:'7px 10px',fontSize:'14px',outline:'none'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
              <p style={{color:'#64748b',fontSize:'13px'}}>IVA inclusa</p>
              <p style={{fontSize:'13px'}}>€{iva.toFixed(2)}</p>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:'2px solid #0f172a'}}>
              <p style={{fontWeight:'700',fontSize:'18px'}}>TOTALE</p>
              <p style={{fontWeight:'700',fontSize:'18px',color:'#3b82f6'}}>€{totale.toFixed(2)}</p>
            </div>
          </div>

          {/* Metodi pagamento */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'12px'}}>
            {['Contanti','Carta','Satispay','Altro'].map(m => (
              <button key={m} onClick={()=>setPagamento(m)}
                style={{background:pagamento===m?'#1e293b':'#f8fafc',color:pagamento===m?'white':'#374151',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px',fontSize:'14px',cursor:'pointer',fontWeight:pagamento===m?'600':'400'}}>
                {m==='Contanti'?'💵':m==='Carta'?'💳':m==='Satispay'?'📱':'✏️'} {m}
              </button>
            ))}
          </div>

          {pagamento === 'Contanti' && (
            <div style={{marginTop:'12px'}}>
              <input type="number" placeholder="Importo ricevuto" value={contanti} onChange={e=>setContanti(e.target.value)}
                style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',marginBottom:'8px'}}/>
              {parseFloat(contanti) >= totale && <p style={{color:'#22c55e',fontWeight:'700',fontSize:'16px',textAlign:'center'}}>Resto: €{resto.toFixed(2)}</p>}
            </div>
          )}

          <button onClick={completaVendita} disabled={!pagamento}
            style={{width:'100%',background: pagamento?'#22c55e':'#e2e8f0',color: pagamento?'white':'#94a3b8',border:'none',borderRadius:'8px',padding:'14px',fontSize:'16px',fontWeight:'700',cursor:pagamento?'pointer':'not-allowed',marginTop:'12px'}}>
            ✅ Completa Vendita
          </button>
        </div>
      )}
    </div>
  )
}
