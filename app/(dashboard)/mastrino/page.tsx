'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'
const inp = (extra?: any): any => ({ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff', ...extra })
const btn = (bg: string, extra?: any): any => ({ background:bg, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13, ...extra })

export default function MastrinoPage() {
  const [clienti, setClienti] = useState<any[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [documentiAperti, setDocumentiAperti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClienti, setLoadingClienti] = useState(true)
  const [cercaInput, setCercaInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [tab, setTab] = useState<'movimenti'|'documenti'|'sintesi'>('movimenti')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [showIncasso, setShowIncasso] = useState(false)
  const [docIncasso, setDocIncasso] = useState<any>(null)
  const [importoIncasso, setImportoIncasso] = useState('')
  const [metodoIncasso, setMetodoIncasso] = useState('contanti')
  const [dataIncasso, setDataIncasso] = useState(new Date().toISOString().split('T')[0])
  const [noteIncasso, setNoteIncasso] = useState('')
  const [savingIncasso, setSavingIncasso] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadClienti() }, [])

  async function loadClienti() {
    setLoadingClienti(true)
    const { data } = await supabaseAdmin.from('clienti').select('id, nome, cognome, ragione_sociale, codice_cliente, citta, telefono, piva, email').order('nome')
    setClienti(data || [])
    setLoadingClienti(false)
  }

  async function selezionaCliente(c: any) {
    setClienteSelezionato(c)
    setCercaInput(c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim())
    setShowDropdown(false)
    setLoading(true)
    await Promise.all([loadMovimenti(c.id), loadDocumentiAperti(c.id)])
    setLoading(false)
  }

  async function loadMovimenti(cid: string) {
    let q = supabaseAdmin.from('mastino_clienti').select('*').eq('cliente_id', cid).order('data_movimento', { ascending: false })
    if (filtroDal) q = q.gte('data_movimento', filtroDal)
    if (filtroAl) q = q.lte('data_movimento', filtroAl)
    const { data } = await q
    setMovimenti(data || [])
  }

  async function loadDocumentiAperti(cid: string) {
    const { data } = await supabaseAdmin.from('documenti').select('*').eq('cliente_id', cid).not('stato', 'in', '("pagato","annullato")').order('data_documento', { ascending: false })
    setDocumentiAperti(data || [])
  }

  async function apriIncasso(doc: any) {
    setDocIncasso(doc)
    const residuo = Number(doc.totale_documento||0) - Number(doc.importo_pagato||0)
    setImportoIncasso(residuo > 0 ? residuo.toFixed(2) : (doc.totale_documento||0).toFixed(2))
    setMetodoIncasso('contanti')
    setDataIncasso(new Date().toISOString().split('T')[0])
    setNoteIncasso(''); setError('')
    setShowIncasso(true)
  }

  async function eseguiIncasso() {
    if (!docIncasso || !clienteSelezionato) return
    const importo = parseFloat(importoIncasso)
    if (!importo || importo <= 0) { setError('Inserisci un importo valido'); return }
    setSavingIncasso(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', clienteSelezionato.id).order('created_at', { ascending: false }).limit(1)
    const saldoPrec = Number(lastMov?.[0]?.saldo_progressivo || 0)
    const nuovoSaldo = saldoPrec - importo
    const nomeC = clienteSelezionato.ragione_sociale || `${clienteSelezionato.nome||''} ${clienteSelezionato.cognome||''}`.trim()
    await supabaseAdmin.from('mastino_clienti').insert([{
      user_id: uid, cliente_id: clienteSelezionato.id, cliente_nome: nomeC,
      documento_id: docIncasso.id, numero_doc: docIncasso.numero_doc,
      data_movimento: dataIncasso, causale: `Incasso ${docIncasso.numero_doc||'documento'} - ${metodoIncasso}`,
      tipo_movimento: 'avere', importo_dare: 0, importo_avere: importo,
      saldo_progressivo: nuovoSaldo, pagato: true, data_pagamento: dataIncasso,
      metodo_pagamento: metodoIncasso, note: noteIncasso||null,
    }])
    const nuovoImportoPagato = Number(docIncasso.importo_pagato||0) + importo
    const totDoc = Number(docIncasso.totale_documento||0)
    const nuovoStato = nuovoImportoPagato >= totDoc ? 'pagato' : 'aperto'
    await supabaseAdmin.from('documenti').update({ stato: nuovoStato, importo_pagato: nuovoImportoPagato, updated_at: new Date().toISOString() }).eq('id', docIncasso.id)
    const anno = new Date().getFullYear()
    const { count } = await supabaseAdmin.from('partita_doppia').select('*', { count: 'exact', head: true }).gte('created_at', anno+'-01-01')
    const numReg = `${anno}-REG-${String((count||0)+1).padStart(5,'0')}`
    await supabaseAdmin.from('partita_doppia').insert([{
      user_id: uid, data_movimento: dataIncasso, numero_registrazione: numReg,
      causale: `Incasso ${docIncasso.numero_doc||'documento'} - ${nomeC}`,
      tipo: 'incasso', conto_dare: metodoIncasso==='banca'?'Banca c/c':'Cassa',
      conto_avere: 'Crediti v/Clienti', importo_dare: importo, importo_avere: importo,
      cliente_id: clienteSelezionato.id, cliente_nome: nomeC,
      documento_id: docIncasso.id, numero_doc: docIncasso.numero_doc,
    }])
    setSuccess(`Incasso di EUR ${importo.toFixed(2)} registrato!`)
    setTimeout(() => setSuccess(''), 4000)
    setShowIncasso(false); setSavingIncasso(false)
    await Promise.all([loadMovimenti(clienteSelezionato.id), loadDocumentiAperti(clienteSelezionato.id)])
  }

  const clientiFiltrati = clienti.filter(c => {
    const n = (c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`).toLowerCase()
    return !cercaInput || n.includes(cercaInput.toLowerCase()) || (c.codice_cliente||'').toLowerCase().includes(cercaInput.toLowerCase())
  }).slice(0, 10)

  const totDare = movimenti.reduce((s,m) => s + Number(m.importo_dare||0), 0)
  const totAvere = movimenti.reduce((s,m) => s + Number(m.importo_avere||0), 0)
  const saldoFinale = movimenti.length > 0 ? Number(movimenti[0].saldo_progressivo||0) : 0
  const totDocAperti = documentiAperti.filter(d=>d.stato!=='pagato').reduce((s,d) => s + Number(d.totale_documento||0), 0)

  return (
    <div style={{ padding:'20px 24px', background:'#f1f5f9', minHeight:'100%' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:'#1e293b' }}>Mastrino Cliente</h1>
        <p style={{ margin:'4px 0 0', fontSize:13, color:'#64748b' }}>Estratto conto, movimenti contabili e incassi per cliente</p>
      </div>

      {/* Ricerca cliente */}
      <div style={{ background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:20 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:8, letterSpacing:1 }}>SELEZIONA CLIENTE</label>
        <div style={{ position:'relative', maxWidth:500 }}>
          <input
            value={cercaInput}
            onChange={e => {
              setCercaInput(e.target.value)
              if (clienteSelezionato) { setClienteSelezionato(null); setMovimenti([]); setDocumentiAperti([]) }
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Digita nome, ragione sociale o codice cliente..."
            style={{ ...inp(), fontSize:15, padding:'10px 14px', paddingRight:40 }}
          />
          {cercaInput && (
            <button onClick={() => { setCercaInput(''); setClienteSelezionato(null); setMovimenti([]); setDocumentiAperti([]) }} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:18, padding:0 }}>x</button>
          )}
          {showDropdown && clientiFiltrati.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, zIndex:50, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxHeight:280, overflowY:'auto', marginTop:4 }}>
              {clientiFiltrati.map(c => {
                const nome = c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim()
                return (
                  <div key={c.id} onMouseDown={() => selezionaCliente(c)} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }} onMouseEnter={e=>(e.currentTarget.style.background='#f0f9ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#1e293b' }}>{nome}</div>
                      <div style={{ fontSize:11, color:'#94a3b8' }}>{c.codice_cliente?`Cod. ${c.codice_cliente}`:''} {c.citta?`— ${c.citta}`:''}</div>
                    </div>
                    {c.telefono && <div style={{ fontSize:12, color:'#64748b' }}>{c.telefono}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {clienteSelezionato && (
        <>
          {/* KPI */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'TOTALE DARE', val:`EUR ${totDare.toFixed(2)}`, color:'#ef4444', border:'#ef4444' },
              { label:'TOTALE AVERE', val:`EUR ${totAvere.toFixed(2)}`, color:'#10b981', border:'#10b981' },
              { label:'SALDO RESIDUO', val:`EUR ${Math.abs(saldoFinale).toFixed(2)} ${saldoFinale>0?'(dare)':'(avere)'}`, color:saldoFinale>0?'#f59e0b':'#10b981', border:saldoFinale>0?'#f59e0b':'#10b981' },
              { label:'DOC. APERTI', val:`${documentiAperti.filter(d=>d.stato!=='pagato').length} — EUR ${totDocAperti.toFixed(2)}`, color:'#3b82f6', border:'#3b82f6' },
            ].map(k => (
              <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', borderLeft:`4px solid ${k.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:16, fontWeight:800, color:k.color }}>{k.val}</div>
              </div>
            ))}
          </div>

          {success && <div style={{ background:'#d1fae5', color:'#065f46', padding:'10px 16px', borderRadius:8, marginBottom:12, fontSize:13, fontWeight:600 }}>{success}</div>}

          {/* Tabs */}
          <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' }}>
            <div style={{ display:'flex', borderBottom:'2px solid #e2e8f0', flexWrap:'wrap' }}>
              {[['movimenti','Movimenti Contabili'],['documenti','Documenti Aperti'],['sintesi','Sintesi Cliente']].map(([t,label]) => (
                <button key={t} onClick={() => setTab(t as any)} style={{ padding:'12px 20px', border:'none', cursor:'pointer', fontWeight:tab===t?700:500, background:tab===t?'#eff6ff':'#fff', color:tab===t?'#3b82f6':'#64748b', fontSize:13, borderBottom:tab===t?'2px solid #3b82f6':'2px solid transparent', marginBottom:-2 }}>{label}</button>
              ))}
              <div style={{ flex:1 }} />
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px' }}>
                <input type="date" value={filtroDal} onChange={e=>setFiltroDal(e.target.value)} style={{ border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px', fontSize:12 }} />
                <span style={{ fontSize:12, color:'#94a3b8' }}>→</span>
                <input type="date" value={filtroAl} onChange={e=>setFiltroAl(e.target.value)} style={{ border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px', fontSize:12 }} />
                <button onClick={() => clienteSelezionato && loadMovimenti(clienteSelezionato.id)} style={{ background:'#3b82f6', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>Filtra</button>
              </div>
            </div>

            {loading ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Caricamento...</div> : (
              <>
                {tab === 'movimenti' && (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Data','Causale','N. Documento','Dare','Avere','Saldo Prog.','Pagamento','Stato'].map(h => (
                            <th key={h} style={{ padding:'10px 12px', textAlign:['Dare','Avere','Saldo Prog.'].includes(h)?'right':'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movimenti.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Nessun movimento per questo cliente</td></tr>
                        ) : movimenti.map((m,i) => (
                          <tr key={m.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                            <td style={{ padding:'9px 12px', fontSize:13, whiteSpace:'nowrap' }}>{m.data_movimento}</td>
                            <td style={{ padding:'9px 12px', fontSize:13, maxWidth:250, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.causale}</td>
                            <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', color:'#64748b' }}>{m.numero_doc||'--'}</td>
                            <td style={{ padding:'9px 12px', fontSize:14, fontWeight:700, color:'#ef4444', textAlign:'right', whiteSpace:'nowrap' }}>{Number(m.importo_dare)>0?`EUR ${Number(m.importo_dare).toFixed(2)}`:''}</td>
                            <td style={{ padding:'9px 12px', fontSize:14, fontWeight:700, color:'#10b981', textAlign:'right', whiteSpace:'nowrap' }}>{Number(m.importo_avere)>0?`EUR ${Number(m.importo_avere).toFixed(2)}`:''}</td>
                            <td style={{ padding:'9px 12px', fontSize:14, fontWeight:700, textAlign:'right', whiteSpace:'nowrap', color:Number(m.saldo_progressivo)>0?'#f59e0b':'#10b981' }}>EUR {Number(m.saldo_progressivo).toFixed(2)}</td>
                            <td style={{ padding:'9px 12px', fontSize:12, color:'#64748b' }}>{m.metodo_pagamento||'--'}</td>
                            <td style={{ padding:'9px 12px' }}>
                              {m.pagato ? <span style={{ background:'#d1fae5', color:'#065f46', padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700 }}>PAGATO</span> : <span style={{ background:'#fef3c7', color:'#92400e', padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700 }}>APERTO</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {movimenti.length > 0 && (
                        <tfoot>
                          <tr style={{ background:'#f8fafc', borderTop:'2px solid #e2e8f0' }}>
                            <td colSpan={3} style={{ padding:'10px 12px', fontSize:12, fontWeight:700, color:'#64748b' }}>TOTALI</td>
                            <td style={{ padding:'10px 12px', fontSize:14, fontWeight:800, color:'#ef4444', textAlign:'right' }}>EUR {totDare.toFixed(2)}</td>
                            <td style={{ padding:'10px 12px', fontSize:14, fontWeight:800, color:'#10b981', textAlign:'right' }}>EUR {totAvere.toFixed(2)}</td>
                            <td style={{ padding:'10px 12px', fontSize:14, fontWeight:800, textAlign:'right', color:saldoFinale>0?'#f59e0b':'#10b981' }}>EUR {Math.abs(saldoFinale).toFixed(2)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                )}

                {tab === 'documenti' && (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['N. Documento','Tipo','Data','Totale','Pagato','Residuo','Stato','Azioni'].map(h => (
                            <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {documentiAperti.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Nessun documento aperto per questo cliente</td></tr>
                        ) : documentiAperti.map((d,i) => {
                          const totale = Number(d.totale_documento||0)
                          const pagato = Number(d.importo_pagato||0)
                          const residuo = totale - pagato
                          const sc = d.stato==='pagato'?{bg:'#d1fae5',color:'#065f46'}:d.stato==='bozza'?{bg:'#f1f5f9',color:'#64748b'}:{bg:'#fef3c7',color:'#92400e'}
                          return (
                            <tr key={d.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                              <td style={{ padding:'9px 12px', fontSize:13, fontWeight:600, fontFamily:'monospace' }}>{d.numero_doc||'--'}</td>
                              <td style={{ padding:'9px 12px', fontSize:12 }}>{d.tipo?.toUpperCase()}</td>
                              <td style={{ padding:'9px 12px', fontSize:13, whiteSpace:'nowrap' }}>{d.data_documento}</td>
                              <td style={{ padding:'9px 12px', fontSize:14, fontWeight:700, whiteSpace:'nowrap' }}>EUR {totale.toFixed(2)}</td>
                              <td style={{ padding:'9px 12px', fontSize:13, color:'#10b981', whiteSpace:'nowrap' }}>{pagato>0?`EUR ${pagato.toFixed(2)}`:'--'}</td>
                              <td style={{ padding:'9px 12px', fontSize:14, fontWeight:700, color:residuo>0?'#ef4444':'#10b981', whiteSpace:'nowrap' }}>EUR {residuo.toFixed(2)}</td>
                              <td style={{ padding:'9px 12px' }}><span style={{ background:sc.bg, color:sc.color, padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:700 }}>{d.stato?.toUpperCase()}</span></td>
                              <td style={{ padding:'9px 12px' }}>
                                {d.stato!=='pagato' && d.stato!=='annullato' && (
                                  <button onClick={() => apriIncasso(d)} style={{ background:'#10b981', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12, fontWeight:700 }}>Incassa</button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'sintesi' && (
                  <div style={{ padding:24 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                      <div style={{ background:'#f8fafc', borderRadius:12, padding:20, border:'1px solid #e2e8f0' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#64748b', marginBottom:16, letterSpacing:1 }}>DATI CLIENTE</div>
                        {[
                          ['Ragione Sociale', clienteSelezionato.ragione_sociale || `${clienteSelezionato.nome||''} ${clienteSelezionato.cognome||''}`.trim()],
                          ['Codice', clienteSelezionato.codice_cliente||'--'],
                          ['P.IVA', clienteSelezionato.piva||'--'],
                          ['Email', clienteSelezionato.email||'--'],
                          ['Telefono', clienteSelezionato.telefono||'--'],
                          ['Città', clienteSelezionato.citta||'--'],
                        ].map(([k,v]) => (
                          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
                            <span style={{ color:'#64748b' }}>{k}</span><span style={{ fontWeight:600 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ background:'#f8fafc', borderRadius:12, padding:20, border:'1px solid #e2e8f0' }}>
                        <div style={{ fontSize:13, fontWeight:700, color:'#64748b', marginBottom:16, letterSpacing:1 }}>RIEPILOGO CONTABILE</div>
                        {[
                          ['Totale Venduto', `EUR ${totDare.toFixed(2)}`, '#ef4444'],
                          ['Totale Incassato', `EUR ${totAvere.toFixed(2)}`, '#10b981'],
                          ['Saldo Residuo', `EUR ${Math.abs(saldoFinale).toFixed(2)}`, saldoFinale>0?'#f59e0b':'#10b981'],
                          ['Documenti Aperti', `${documentiAperti.filter(d=>d.stato!=='pagato').length}`, '#3b82f6'],
                          ['Tot. da Incassare', `EUR ${totDocAperti.toFixed(2)}`, '#f59e0b'],
                        ].map(([k,v,c]) => (
                          <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:10 }}>
                            <span style={{ color:'#64748b' }}>{k}</span><span style={{ fontWeight:700, color:c }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {!clienteSelezionato && !loadingClienti && (
        <div style={{ background:'#fff', borderRadius:12, padding:60, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>👤</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#1e293b', marginBottom:8 }}>Seleziona un cliente</div>
          <div style={{ fontSize:14, color:'#64748b' }}>Cerca il cliente nella barra in alto per vedere il suo estratto conto</div>
        </div>
      )}

      {/* Modal Incasso */}
      {showIncasso && docIncasso && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid #e2e8f0', background:'#10b981', borderRadius:'16px 16px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#fff' }}>Registra Incasso</h2>
              <button onClick={() => setShowIncasso(false)} style={{ background:'none', border:'none', color:'#fff', fontSize:22, cursor:'pointer' }}>x</button>
            </div>
            <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ background:'#f0fdf4', borderRadius:10, padding:'12px 16px', border:'1px solid #bbf7d0' }}>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:4 }}>Documento: <strong>{docIncasso.numero_doc}</strong></div>
                <div style={{ fontSize:12, color:'#64748b', marginBottom:4 }}>Cliente: <strong>{clienteSelezionato?.ragione_sociale||clienteSelezionato?.nome}</strong></div>
                <div style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>Totale: EUR {Number(docIncasso.totale_documento||0).toFixed(2)}</div>
                {Number(docIncasso.importo_pagato)>0 && <div style={{ fontSize:12, color:'#10b981' }}>Già pagato: EUR {Number(docIncasso.importo_pagato).toFixed(2)}</div>}
              </div>
              {error && <div style={{ background:'#fee2e2', color:'#991b1b', padding:'8px 12px', borderRadius:8, fontSize:13 }}>{error}</div>}
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>IMPORTO DA INCASSARE *</label>
                <input type="number" step="0.01" style={{ ...inp(), fontSize:20, fontWeight:700, textAlign:'right', color:'#10b981' }} value={importoIncasso} onChange={e=>setImportoIncasso(e.target.value)} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>METODO PAGAMENTO</label>
                  <select style={inp()} value={metodoIncasso} onChange={e=>setMetodoIncasso(e.target.value)}>
                    <option value="contanti">Contanti</option>
                    <option value="banca">Banca/Bonifico</option>
                    <option value="carta">Carta di Credito</option>
                    <option value="assegno">Assegno</option>
                    <option value="riba">RiBa</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>DATA INCASSO</label>
                  <input type="date" style={inp()} value={dataIncasso} onChange={e=>setDataIncasso(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>NOTE</label>
                <input style={inp()} value={noteIncasso} onChange={e=>setNoteIncasso(e.target.value)} placeholder="Note opzionali..." />
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4 }}>
                <button onClick={() => setShowIncasso(false)} style={{ background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontWeight:600, fontSize:14 }}>Annulla</button>
                <button onClick={eseguiIncasso} disabled={savingIncasso} style={btn('#10b981', { padding:'10px 24px', fontSize:14 })}>{savingIncasso?'Registrazione...':'Conferma Incasso'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
