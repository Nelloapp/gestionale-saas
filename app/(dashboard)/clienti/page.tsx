'use client'
import { useState } from 'react'

const clientiDemo = [
  { id: 1, nome: 'Rossi Group SRL', tipo: 'azienda', email: 'info@rossigroup.it', tel: '+39 02 1234567', citta: 'Milano', piva: 'IT12345678901', stato: 'attivo', fatturato: 42000 },
  { id: 2, nome: 'Bianchi SPA', tipo: 'azienda', email: 'info@bianchi.it', tel: '+39 06 9876543', citta: 'Roma', piva: 'IT98765432101', stato: 'attivo', fatturato: 28500 },
  { id: 3, nome: 'Mario Verdi', tipo: 'privato', email: 'mario.verdi@gmail.com', tel: '+39 333 1112222', citta: 'Torino', piva: '', stato: 'attivo', fatturato: 5200 },
  { id: 4, nome: 'Verde & Co SNC', tipo: 'azienda', email: 'verde@co.it', tel: '+39 347 5554444', citta: 'Napoli', piva: 'IT11122233301', stato: 'prospect', fatturato: 0 },
  { id: 5, nome: 'Tech Solutions SRL', tipo: 'azienda', email: 'info@techsol.it', tel: '+39 02 9998887', citta: 'Milano', piva: 'IT55566677701', stato: 'attivo', fatturato: 15800 },
]

export default function ClientiPage() {
  const [clienti, setClienti] = useState(clientiDemo)
  const [cerca, setCerca] = useState('')
  const [mostraForm, setMostraForm] = useState(false)
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [form, setForm] = useState({ nome:'', tipo:'azienda', email:'', tel:'', citta:'', piva:'', stato:'attivo' })

  const filtrati = clienti.filter(c =>
    c.nome.toLowerCase().includes(cerca.toLowerCase()) ||
    c.email.toLowerCase().includes(cerca.toLowerCase()) ||
    c.citta.toLowerCase().includes(cerca.toLowerCase())
  )

  const salvaCliente = () => {
    if (!form.nome) return
    if (clienteSelezionato) {
      setClienti(clienti.map(c => c.id === clienteSelezionato.id ? {...c, ...form} : c))
    } else {
      setClienti([...clienti, { ...form, id: Date.now(), fatturato: 0 }])
    }
    setMostraForm(false)
    setClienteSelezionato(null)
    setForm({ nome:'', tipo:'azienda', email:'', tel:'', citta:'', piva:'', stato:'attivo' })
  }

  const eliminaCliente = (id: number) => {
    if (confirm('Eliminare questo cliente?')) setClienti(clienti.filter(c => c.id !== id))
  }

  const modificaCliente = (c: any) => {
    setClienteSelezionato(c)
    setForm({ nome:c.nome, tipo:c.tipo, email:c.email, tel:c.tel, citta:c.citta, piva:c.piva, stato:c.stato })
    setMostraForm(true)
  }

  return (
    <div style={{fontFamily:'system-ui'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>Clienti</h1>
          <p style={{color:'#64748b',fontSize:'14px'}}>{clienti.length} clienti totali</p>
        </div>
        <button onClick={()=>{setMostraForm(true);setClienteSelezionato(null);setForm({nome:'',tipo:'azienda',email:'',tel:'',citta:'',piva:'',stato:'attivo'})}}
          style={{background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'10px 16px',fontWeight:'600',cursor:'pointer',fontSize:'14px'}}>
          + Nuovo Cliente
        </button>
      </div>

      {/* Cerca */}
      <input value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="🔍 Cerca per nome, email, città..."
        style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',marginBottom:'16px',background:'white',outline:'none'}}/>

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>Attivi</p>
          <p style={{fontSize:'24px',fontWeight:'700',color:'#22c55e'}}>{clienti.filter(c=>c.stato==='attivo').length}</p>
        </div>
        <div style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <p style={{color:'#64748b',fontSize:'12px'}}>Prospect</p>
          <p style={{fontSize:'24px',fontWeight:'700',color:'#f59e0b'}}>{clienti.filter(c=>c.stato==='prospect').length}</p>
        </div>
      </div>

      {/* Lista clienti */}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {filtrati.map(c => (
          <div key={c.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
              <div>
                <p style={{fontWeight:'600',color:'#0f172a',fontSize:'15px'}}>{c.nome}</p>
                <p style={{color:'#64748b',fontSize:'12px'}}>{c.tipo === 'azienda' ? '🏢' : '👤'} {c.tipo} · {c.citta}</p>
              </div>
              <span style={{background: c.stato==='attivo' ? '#dcfce7' : '#fef9c3', color: c.stato==='attivo' ? '#166534' : '#854d0e', padding:'2px 8px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>
                {c.stato}
              </span>
            </div>
            <p style={{color:'#64748b',fontSize:'13px',marginBottom:'4px'}}>📧 {c.email}</p>
            <p style={{color:'#64748b',fontSize:'13px',marginBottom:'12px'}}>📞 {c.tel}</p>
            {c.fatturato > 0 && <p style={{color:'#3b82f6',fontSize:'13px',fontWeight:'600',marginBottom:'12px'}}>💰 Fatturato: €{c.fatturato.toString()}</p>}
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={()=>modificaCliente(c)} style={{flex:1,background:'#f1f5f9',color:'#374151',border:'none',borderRadius:'6px',padding:'7px',fontSize:'13px',cursor:'pointer'}}>✏️ Modifica</button>
              <button onClick={()=>eliminaCliente(c.id)} style={{flex:1,background:'#fee2e2',color:'#991b1b',border:'none',borderRadius:'6px',padding:'7px',fontSize:'13px',cursor:'pointer'}}>🗑️ Elimina</button>
            </div>
          </div>
        ))}
      </div>

      {/* Form modale */}
      {mostraForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end'}}>
          <div style={{background:'white',borderRadius:'16px 16px 0 0',padding:'24px',width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'18px',fontWeight:'700'}}>{clienteSelezionato ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
              <button onClick={()=>setMostraForm(false)} style={{background:'none',border:'none',fontSize:'24px',cursor:'pointer'}}>×</button>
            </div>
            {[
              {label:'Nome / Ragione Sociale *', key:'nome', type:'text', placeholder:'Es. Rossi SRL'},
              {label:'Email', key:'email', type:'email', placeholder:'info@azienda.it'},
              {label:'Telefono', key:'tel', type:'tel', placeholder:'+39 02 1234567'},
              {label:'Città', key:'citta', type:'text', placeholder:'Milano'},
              {label:'P.IVA / CF', key:'piva', type:'text', placeholder:'IT12345678901'},
            ].map(field => (
              <div key={field.key} style={{marginBottom:'14px'}}>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500',color:'#374151'}}>{field.label}</label>
                <input type={field.type} placeholder={field.placeholder} value={(form as any)[field.key]}
                  onChange={e=>setForm({...form,[field.key]:e.target.value})}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
              </div>
            ))}
            <div style={{marginBottom:'14px'}}>
              <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500',color:'#374151'}}>Tipo</label>
              <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}
                style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                <option value="azienda">🏢 Azienda</option>
                <option value="privato">👤 Privato</option>
                <option value="pubblica_amministrazione">🏛️ Pubblica Amministrazione</option>
                <option value="estero">🌍 Cliente Estero</option>
              </select>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500',color:'#374151'}}>Stato</label>
              <select value={form.stato} onChange={e=>setForm({...form,stato:e.target.value})}
                style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none',background:'white'}}>
                <option value="attivo">✅ Attivo</option>
                <option value="prospect">🎯 Prospect</option>
                <option value="sospeso">⏸️ Sospeso</option>
              </select>
            </div>
            <button onClick={salvaCliente}
              style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              💾 Salva Cliente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
