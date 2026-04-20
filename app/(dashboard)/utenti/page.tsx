'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/useAuth'

type Profilo = {
  id: string; email: string; nome: string; cognome: string;
  ruolo: string; attivo: boolean; created_at: string;
}

const RUOLI = [
  { value: 'super_admin',  label: 'Super Admin',  color: '#8b5cf6', desc: 'Accesso totale al sistema' },
  { value: 'admin',        label: 'Admin',         color: '#3b82f6', desc: 'Gestione completa tranne sistema' },
  { value: 'manager',      label: 'Manager',       color: '#22c55e', desc: 'Clienti, articoli, cassa, report' },
  { value: 'cassiere',     label: 'Cassiere',      color: '#f59e0b', desc: 'Solo cassa e articoli' },
  { value: 'magazziniere', label: 'Magazziniere',  color: '#06b6d4', desc: 'Solo magazzino e articoli' },
  { value: 'commerciale',  label: 'Commerciale',   color: '#ec4899', desc: 'Solo clienti e ordini' },
]

const PERMESSI_TABELLA: Record<string, string[]> = {
  'Dashboard':    ['super_admin','admin','manager','cassiere','magazziniere','commerciale'],
  'Clienti':      ['super_admin','admin','manager','commerciale'],
  'Articoli':     ['super_admin','admin','manager','magazziniere','cassiere'],
  'Fatture':      ['super_admin','admin','manager','commerciale'],
  'Magazzino':    ['super_admin','admin','manager','magazziniere'],
  'Cassa':        ['super_admin','admin','manager','cassiere'],
  'HR':           ['super_admin','admin'],
  'Commessi':     ['super_admin','admin','manager'],
  'Progetti':     ['super_admin','admin','manager'],
  'Impostazioni': ['super_admin','admin'],
  'Utenti':       ['super_admin'],
}

export default function UtentiPage() {
  const { isSuperAdmin, isAdmin, profilo: myProfilo } = useAuth()
  const [utenti, setUtenti] = useState<Profilo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'utenti'|'ruoli'|'permessi'>('utenti')
  const [showInvita, setShowInvita] = useState(false)
  const [invitaEmail, setInvitaEmail] = useState('')
  const [invitaRuolo, setInvitaRuolo] = useState('cassiere')
  const [invitaNome, setInvitaNome] = useState('')
  const [invitando, setInvitando] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editRuolo, setEditRuolo] = useState('')

  useEffect(() => { loadUtenti() }, [])

  async function loadUtenti() {
    setLoading(true)
    const { data, error } = await supabase.from('profili').select('*').order('created_at', { ascending: true })
    if (error) setError('Errore caricamento: ' + error.message)
    else setUtenti(data || [])
    setLoading(false)
  }

  async function cambiaRuolo(id: string, nuovoRuolo: string) {
    if (!isSuperAdmin && nuovoRuolo === 'super_admin') {
      setError('Solo un Super Admin può assegnare il ruolo Super Admin')
      return
    }
    const { error } = await supabase.from('profili').update({ ruolo: nuovoRuolo, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setError('Errore: ' + error.message)
    else { setSuccess('Ruolo aggiornato!'); setEditingId(null); loadUtenti() }
  }

  async function toggleAttivo(id: string, attivo: boolean) {
    if (id === myProfilo?.id) { setError('Non puoi disattivare te stesso'); return }
    const { error } = await supabase.from('profili').update({ attivo: !attivo }).eq('id', id)
    if (error) setError('Errore: ' + error.message)
    else { setSuccess(attivo ? 'Utente disattivato' : 'Utente attivato'); loadUtenti() }
  }

  async function invitaUtente() {
    if (!invitaEmail.trim()) { setError('Email obbligatoria'); return }
    setInvitando(true); setError(''); setSuccess('')
    // Crea profilo manualmente (in produzione si userebbe Supabase Admin API per inviti email)
    const { error } = await supabase.from('profili').insert([{
      id: crypto.randomUUID(),
      email: invitaEmail.trim(),
      nome: invitaNome.trim(),
      ruolo: invitaRuolo,
      attivo: true,
    }])
    if (error) setError('Errore: ' + error.message)
    else {
      setSuccess('Profilo creato! L\'utente dovrà registrarsi con questa email: ' + invitaEmail)
      setShowInvita(false); setInvitaEmail(''); setInvitaNome(''); setInvitaRuolo('cassiere')
      loadUtenti()
    }
    setInvitando(false)
  }

  const kpi = {
    totale: utenti.length,
    attivi: utenti.filter(u => u.attivo).length,
    admins: utenti.filter(u => ['super_admin','admin'].includes(u.ruolo)).length,
  }

  if (!isAdmin) {
    return (
      <div style={{padding:'40px',textAlign:'center'}}>
        <div style={{fontSize:'64px',marginBottom:'16px'}}>🔒</div>
        <h2 style={{color:'#0f172a',fontSize:'24px',fontWeight:'700'}}>Accesso Negato</h2>
        <p style={{color:'#64748b'}}>Non hai i permessi per accedere a questa sezione.</p>
      </div>
    )
  }

  return (
    <div style={{padding:'20px',maxWidth:'1200px',margin:'0 auto',fontFamily:'system-ui'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
        <div>
          <h1 style={{fontSize:'28px',fontWeight:'800',color:'#0f172a',margin:0}}>Gestione Utenti</h1>
          <p style={{color:'#64748b',margin:'4px 0 0',fontSize:'14px'}}>Ruoli, permessi e accessi</p>
        </div>
        {isSuperAdmin && (
          <button onClick={()=>setShowInvita(true)}
            style={{background:'#8b5cf6',color:'white',border:'none',borderRadius:'10px',padding:'12px 20px',fontWeight:'700',cursor:'pointer',fontSize:'15px'}}>
            + Invita Utente
          </button>
        )}
      </div>

      {/* Messaggi */}
      {error && <div style={{background:'#fee2e2',color:'#991b1b',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px',cursor:'pointer'}} onClick={()=>setError('')}>{error} ✕</div>}
      {success && <div style={{background:'#dcfce7',color:'#166534',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px',cursor:'pointer'}} onClick={()=>setSuccess('')}>{success} ✕</div>}

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'16px',marginBottom:'24px'}}>
        {[
          {label:'Totale Utenti',value:kpi.totale,color:'#3b82f6'},
          {label:'Attivi',value:kpi.attivi,color:'#22c55e'},
          {label:'Admin/SuperAdmin',value:kpi.admins,color:'#8b5cf6'},
        ].map(k=>(
          <div key={k.label} style={{background:'white',borderRadius:'12px',padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',borderLeft:`4px solid ${k.color}`}}>
            <div style={{fontSize:'28px',fontWeight:'800',color:k.color}}>{k.value}</div>
            <div style={{fontSize:'13px',color:'#64748b',marginTop:'4px'}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tab */}
      <div style={{display:'flex',gap:'8px',marginBottom:'20px',overflowX:'auto'}}>
        {[
          {id:'utenti',label:'👥 Utenti'},
          {id:'ruoli',label:'🎭 Ruoli'},
          {id:'permessi',label:'🔑 Permessi'},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            style={{background:tab===t.id?'#3b82f6':'white',color:tab===t.id?'white':'#64748b',border:'1px solid #e2e8f0',borderRadius:'99px',padding:'8px 18px',fontSize:'13px',cursor:'pointer',fontWeight:tab===t.id?'700':'400',whiteSpace:'nowrap'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Utenti */}
      {tab === 'utenti' && (
        <div style={{background:'white',borderRadius:'12px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',overflow:'hidden'}}>
          {loading ? (
            <div style={{padding:'40px',textAlign:'center',color:'#64748b'}}>Caricamento...</div>
          ) : utenti.length === 0 ? (
            <div style={{padding:'40px',textAlign:'center',color:'#64748b'}}>Nessun utente trovato</div>
          ) : (
            utenti.map((u, i) => {
              const ruoloInfo = RUOLI.find(r=>r.value===u.ruolo)
              const isMe = u.id === myProfilo?.id
              return (
                <div key={u.id} style={{padding:'16px 20px',borderBottom:i<utenti.length-1?'1px solid #f1f5f9':'none',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                  {/* Avatar */}
                  <div style={{width:'44px',height:'44px',borderRadius:'50%',background:ruoloInfo?.color||'#94a3b8',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'18px',flexShrink:0}}>
                    {(u.nome||u.email||'U')[0].toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{flex:1,minWidth:'150px'}}>
                    <div style={{fontWeight:'600',color:'#0f172a',fontSize:'14px'}}>
                      {u.nome ? `${u.nome} ${u.cognome||''}` : u.email}
                      {isMe && <span style={{marginLeft:'6px',background:'#e0f2fe',color:'#0369a1',padding:'1px 6px',borderRadius:'99px',fontSize:'10px',fontWeight:'700'}}>TU</span>}
                    </div>
                    <div style={{color:'#64748b',fontSize:'12px'}}>{u.email}</div>
                  </div>
                  {/* Ruolo */}
                  <div style={{minWidth:'140px'}}>
                    {editingId === u.id && isSuperAdmin ? (
                      <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                        <select value={editRuolo} onChange={e=>setEditRuolo(e.target.value)}
                          style={{border:'1px solid #e2e8f0',borderRadius:'6px',padding:'4px 8px',fontSize:'12px',outline:'none'}}>
                          {RUOLI.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        <button onClick={()=>cambiaRuolo(u.id,editRuolo)}
                          style={{background:'#22c55e',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',fontSize:'11px',cursor:'pointer',fontWeight:'700'}}>✓</button>
                        <button onClick={()=>setEditingId(null)}
                          style={{background:'#ef4444',color:'white',border:'none',borderRadius:'6px',padding:'4px 8px',fontSize:'11px',cursor:'pointer'}}>✕</button>
                      </div>
                    ) : (
                      <span style={{background:ruoloInfo?.color+'20'||'#f1f5f9',color:ruoloInfo?.color||'#64748b',padding:'4px 10px',borderRadius:'99px',fontSize:'12px',fontWeight:'700',border:`1px solid ${ruoloInfo?.color||'#e2e8f0'}`}}>
                        {ruoloInfo?.label||u.ruolo}
                      </span>
                    )}
                  </div>
                  {/* Stato */}
                  <span style={{background:u.attivo?'#dcfce7':'#fee2e2',color:u.attivo?'#166534':'#991b1b',padding:'3px 10px',borderRadius:'99px',fontSize:'11px',fontWeight:'600'}}>
                    {u.attivo?'Attivo':'Disattivo'}
                  </span>
                  {/* Azioni */}
                  {isSuperAdmin && !isMe && (
                    <div style={{display:'flex',gap:'6px'}}>
                      <button onClick={()=>{setEditingId(u.id);setEditRuolo(u.ruolo)}}
                        style={{background:'#f1f5f9',border:'none',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',cursor:'pointer',fontWeight:'600'}}>
                        ✏️ Ruolo
                      </button>
                      <button onClick={()=>toggleAttivo(u.id,u.attivo)}
                        style={{background:u.attivo?'#fee2e2':'#dcfce7',border:'none',borderRadius:'6px',padding:'6px 10px',fontSize:'12px',cursor:'pointer',fontWeight:'600',color:u.attivo?'#991b1b':'#166534'}}>
                        {u.attivo?'🔒 Blocca':'✅ Attiva'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Tab Ruoli */}
      {tab === 'ruoli' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px'}}>
          {RUOLI.map(r=>(
            <div key={r.value} style={{background:'white',borderRadius:'12px',padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',borderTop:`4px solid ${r.color}`}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
                <span style={{background:r.color+'20',color:r.color,padding:'4px 12px',borderRadius:'99px',fontSize:'13px',fontWeight:'700',border:`1px solid ${r.color}`}}>
                  {r.label}
                </span>
                <span style={{background:'#f1f5f9',color:'#64748b',padding:'2px 8px',borderRadius:'99px',fontSize:'11px'}}>
                  {utenti.filter(u=>u.ruolo===r.value).length} utenti
                </span>
              </div>
              <p style={{color:'#64748b',fontSize:'13px',margin:'0 0 12px'}}>{r.desc}</p>
              <div style={{fontSize:'12px',color:'#94a3b8'}}>
                Accesso a: {Object.entries(PERMESSI_TABELLA).filter(([,ruoli])=>ruoli.includes(r.value)).map(([s])=>s).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Permessi */}
      {tab === 'permessi' && (
        <div style={{background:'white',borderRadius:'12px',boxShadow:'0 1px 4px rgba(0,0,0,0.08)',overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                <th style={{padding:'12px 16px',textAlign:'left',fontWeight:'700',color:'#374151',borderBottom:'2px solid #e2e8f0'}}>Sezione</th>
                {RUOLI.map(r=>(
                  <th key={r.value} style={{padding:'12px 8px',textAlign:'center',fontWeight:'700',color:r.color,borderBottom:'2px solid #e2e8f0',whiteSpace:'nowrap'}}>
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PERMESSI_TABELLA).map(([sezione,ruoliConAccesso],i)=>(
                <tr key={sezione} style={{background:i%2===0?'white':'#f8fafc'}}>
                  <td style={{padding:'10px 16px',fontWeight:'600',color:'#0f172a',borderBottom:'1px solid #f1f5f9'}}>{sezione}</td>
                  {RUOLI.map(r=>(
                    <td key={r.value} style={{padding:'10px 8px',textAlign:'center',borderBottom:'1px solid #f1f5f9'}}>
                      {ruoliConAccesso.includes(r.value) ? (
                        <span style={{color:'#22c55e',fontSize:'18px'}}>✓</span>
                      ) : (
                        <span style={{color:'#e2e8f0',fontSize:'18px'}}>✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Invita */}
      {showInvita && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:'white',borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'420px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h3 style={{margin:0,fontSize:'18px',fontWeight:'700',color:'#0f172a'}}>Invita Utente</h3>
              <button onClick={()=>setShowInvita(false)} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:'#64748b'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontWeight:'600',fontSize:'13px',color:'#374151'}}>Nome</label>
                <input value={invitaNome} onChange={e=>setInvitaNome(e.target.value)}
                  placeholder="Nome utente"
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontWeight:'600',fontSize:'13px',color:'#374151'}}>Email *</label>
                <input value={invitaEmail} onChange={e=>setInvitaEmail(e.target.value)}
                  placeholder="email@azienda.it" type="email"
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div>
                <label style={{display:'block',marginBottom:'4px',fontWeight:'600',fontSize:'13px',color:'#374151'}}>Ruolo</label>
                <select value={invitaRuolo} onChange={e=>setInvitaRuolo(e.target.value)}
                  style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:'8px',padding:'10px 12px',fontSize:'14px',outline:'none',background:'white',boxSizing:'border-box'}}>
                  {RUOLI.filter(r=>r.value!=='super_admin').map(r=>(
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>
              <button onClick={invitaUtente} disabled={invitando}
                style={{background:'#8b5cf6',color:'white',border:'none',borderRadius:'10px',padding:'12px',fontWeight:'700',cursor:'pointer',fontSize:'15px',marginTop:'4px'}}>
                {invitando ? 'Creazione...' : '+ Crea Profilo Utente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
