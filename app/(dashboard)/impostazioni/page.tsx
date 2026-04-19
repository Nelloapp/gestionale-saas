'use client'
import { useState } from 'react'

export default function ImpostazioniPage() {
  const [tab, setTab] = useState('azienda')
  const [azienda, setAzienda] = useState({
    nome:'Acme SRL', piva:'IT12345678901', cf:'12345678901',
    email:'info@acme.it', tel:'+39 02 1234567',
    indirizzo:'Via Roma 1', citta:'Milano', cap:'20100',
    pec:'acme@pec.it', sdi:'ABC1234', iban:'IT60X0542811101000000123456'
  })
  const [utenti] = useState([
    { id:1, nome:'Mario Rossi', email:'mario@acme.it', ruolo:'admin', stato:'attivo' },
    { id:2, nome:'Sara Ferri', email:'sara@acme.it', ruolo:'manager', stato:'attivo' },
    { id:3, nome:'Luca Neri', email:'luca@acme.it', ruolo:'membro', stato:'attivo' },
  ])
  const [piano] = useState({ nome:'Trial', scade:'2026-05-03', giorni_rimasti:14 })
  const [notifiche, setNotifiche] = useState({
    stock_sotto_soglia: true,
    fatture_scadute: true,
    nuove_richieste_ferie: true,
    riepilogo_giornaliero: false,
  })
  const [salvato, setSalvato] = useState(false)

  const salvaAzienda = () => {
    setSalvato(true)
    setTimeout(() => setSalvato(false), 2000)
  }

  const tabs = ['azienda','utenti','piano','notifiche']

  return (
    <div style={{fontFamily:'system-ui'}}>
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'24px',fontWeight:'700',color:'#0f172a'}}>Impostazioni</h1>
        <p style={{color:'#64748b',fontSize:'14px'}}>Configura il tuo gestionale</p>
      </div>

      {/* Tab */}
      <div style={{display:'flex',gap:'8px',marginBottom:'20px',overflowX:'auto',paddingBottom:'4px'}}>
        {tabs.map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{background:tab===t?'#3b82f6':'white',color:tab===t?'white':'#64748b',border:'1px solid #e2e8f0',borderRadius:'99px',padding:'6px 16px',fontSize:'13px',cursor:'pointer',fontWeight:tab===t?'600':'400',whiteSpace:'nowrap',textTransform:'capitalize'}}>
            {t==='azienda'?'🏢 Azienda':t==='utenti'?'👥 Utenti':t==='piano'?'💳 Piano':'🔔 Notifiche'}
          </button>
        ))}
      </div>

      {/* Azienda */}
      {tab==='azienda' && (
        <div style={{background:'white',borderRadius:'12px',padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontSize:'16px',fontWeight:'700',marginBottom:'16px'}}>Dati Azienda</h3>
          {[
            {label:'Ragione Sociale',key:'nome'},
            {label:'Partita IVA',key:'piva'},
            {label:'Codice Fiscale',key:'cf'},
            {label:'Email',key:'email'},
            {label:'Telefono',key:'tel'},
            {label:'Indirizzo',key:'indirizzo'},
            {label:'Città',key:'citta'},
            {label:'CAP',key:'cap'},
            {label:'PEC',key:'pec'},
            {label:'Codice SDI',key:'sdi'},
            {label:'IBAN',key:'iban'},
          ].map(f => (
            <div key={f.key} style={{marginBottom:'14px'}}>
              <label style={{display:'block',marginBottom:'4px',fontSize:'13px',fontWeight:'500',color:'#374151'}}>{f.label}</label>
              <input value={(azienda as any)[f.key]} onChange={e=>setAzienda({...azienda,[f.key]:e.target.value})}
                style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'9px 12px',fontSize:'14px',outline:'none'}}/>
            </div>
          ))}
          <button onClick={salvaAzienda}
            style={{width:'100%',background: salvato ? '#22c55e' : '#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'15px',fontWeight:'600',cursor:'pointer',transition:'background 0.3s'}}>
            {salvato ? '✅ Salvato!' : '💾 Salva Modifiche'}
          </button>
        </div>
      )}

      {/* Utenti */}
      {tab==='utenti' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <p style={{fontWeight:'600',color:'#0f172a'}}>{utenti.length} utenti attivi</p>
            <button style={{background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'8px 14px',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>
              + Invita Utente
            </button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {utenti.map(u => (
              <div key={u.id} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{fontWeight:'600',color:'#0f172a'}}>{u.nome}</p>
                    <p style={{color:'#64748b',fontSize:'13px'}}>{u.email}</p>
                  </div>
                  <span style={{background: u.ruolo==='admin'?'#fef9c3':u.ruolo==='manager'?'#dbeafe':'#f1f5f9', color: u.ruolo==='admin'?'#854d0e':u.ruolo==='manager'?'#1e40af':'#475569', padding:'3px 10px',borderRadius:'99px',fontSize:'12px',fontWeight:'600'}}>
                    {u.ruolo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Piano */}
      {tab==='piano' && (
        <div>
          <div style={{background:'white',borderRadius:'12px',padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{fontSize:'16px',fontWeight:'700'}}>Piano Attuale</h3>
              <span style={{background:'#fef9c3',color:'#854d0e',padding:'4px 12px',borderRadius:'99px',fontSize:'13px',fontWeight:'700'}}>
                {piano.nome}
              </span>
            </div>
            <div style={{background:'#fef9c3',borderRadius:'8px',padding:'12px',marginBottom:'16px'}}>
              <p style={{color:'#854d0e',fontWeight:'600',fontSize:'14px'}}>⚠️ Trial scade tra {piano.giorni_rimasti} giorni</p>
              <p style={{color:'#854d0e',fontSize:'13px'}}>Scadenza: {piano.scade}</p>
            </div>
            <button style={{width:'100%',background:'#3b82f6',color:'white',border:'none',borderRadius:'8px',padding:'12px',fontSize:'15px',fontWeight:'600',cursor:'pointer'}}>
              🚀 Upgrade a Pro — €79/mese
            </button>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {[
              {nome:'Starter', prezzo:'€29/mese', features:'5 utenti · 1.000 fatture/anno', colore:'#64748b'},
              {nome:'Pro', prezzo:'€79/mese', features:'20 utenti · Illimitato', colore:'#3b82f6'},
              {nome:'Enterprise', prezzo:'Custom', features:'Illimitato · White-label · SLA', colore:'#8b5cf6'},
            ].map(p => (
              <div key={p.nome} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderLeft:`4px solid ${p.colore}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
                  <p style={{fontWeight:'700',color:'#0f172a',fontSize:'15px'}}>{p.nome}</p>
                  <p style={{fontWeight:'700',color:p.colore,fontSize:'15px'}}>{p.prezzo}</p>
                </div>
                <p style={{color:'#64748b',fontSize:'13px',marginBottom:'12px'}}>{p.features}</p>
                <button style={{width:'100%',background:p.colore,color:'white',border:'none',borderRadius:'8px',padding:'9px',fontSize:'13px',fontWeight:'600',cursor:'pointer'}}>
                  Seleziona {p.nome}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifiche */}
      {tab==='notifiche' && (
        <div style={{background:'white',borderRadius:'12px',padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <h3 style={{fontSize:'16px',fontWeight:'700',marginBottom:'16px'}}>Preferenze Notifiche</h3>
          {[
            {key:'stock_sotto_soglia', label:'Stock sotto soglia', desc:'Avvisami quando un articolo scende sotto il minimo'},
            {key:'fatture_scadute', label:'Fatture scadute', desc:'Avvisami quando una fattura supera la scadenza'},
            {key:'nuove_richieste_ferie', label:'Richieste ferie', desc:'Avvisami per nuove richieste di ferie o permessi'},
            {key:'riepilogo_giornaliero', label:'Riepilogo giornaliero', desc:'Ricevi un riepilogo ogni sera alle 18:00'},
          ].map(n => (
            <div key={n.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid #f1f5f9'}}>
              <div style={{flex:1,marginRight:'16px'}}>
                <p style={{fontWeight:'600',color:'#0f172a',fontSize:'14px'}}>{n.label}</p>
                <p style={{color:'#64748b',fontSize:'12px'}}>{n.desc}</p>
              </div>
              <button onClick={()=>setNotifiche({...notifiche,[n.key]:!(notifiche as any)[n.key]})}
                style={{background:(notifiche as any)[n.key]?'#3b82f6':'#e2e8f0',border:'none',borderRadius:'99px',width:'48px',height:'26px',cursor:'pointer',transition:'background 0.2s',position:'relative',flexShrink:0}}>
                <div style={{position:'absolute',top:'3px',left:(notifiche as any)[n.key]?'25px':'3px',width:'20px',height:'20px',background:'white',borderRadius:'50%',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
