'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

const inp = (extra?: any): any => ({ border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', background:'#fff', ...extra })
const btn = (bg: string, extra?: any): any => ({ background:bg, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13, ...extra })

export default function MastrinoPage() {
  const [clienti, setClienti] = useState<any[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [documentiAperti, setDocumentiAperti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [cerca, setCerca] = useState('')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [tab, setTab] = useState<'mastrino'|'documenti'>('mastrino')
  // Modal incasso
  const [modalIncasso, setModalIncasso] = useState(false)
  const [incassoDoc, setIncassoDoc] = useState<any>(null)
  const [importoIncasso, setImportoIncasso] = useState('')
  const [pagamentoIncasso, setPagamentoIncasso] = useState('contanti')
  const [noteIncasso, setNoteIncasso] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadClienti() }, [])

  async function loadClienti() {
    const { data } = await supabaseAdmin.from('clienti').select('id, nome, cognome, ragione_sociale, email, telefono, piva').order('nome')
    setClienti(data || [])
  }

  async function selezionaCliente(c: any) {
    setClienteSelezionato(c)
    setLoading(true)
    await Promise.all([loadMovimenti(c.id), loadDocumentiAperti(c.id)])
    setLoading(false)
  }

  async function loadMovimenti(clienteId: string) {
    const { data } = await supabaseAdmin.from('mastino_clienti').select('*').eq('cliente_id', clienteId).order('data_movimento', { ascending: true })
    setMovimenti(data || [])
  }

  async function loadDocumentiAperti(clienteId: string) {
    const { data } = await supabaseAdmin.from('documenti').select('*').eq('cliente_id', clienteId).not('stato', 'in', '("incassato","annullato")').order('data_documento', { ascending: false })
    setDocumentiAperti(data || [])
  }

  function apriModalIncasso(doc: any) {
    setIncassoDoc(doc)
    setImportoIncasso(String(doc.totale_documento || 0))
    setPagamentoIncasso('contanti')
    setNoteIncasso('')
    setModalIncasso(true)
  }

  async function eseguiIncasso() {
    if (!incassoDoc || !importoIncasso) return
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const oggi = new Date().toISOString().split('T')[0]
    const importo = parseFloat(importoIncasso) || 0
    // Aggiorna stato documento
    await supabaseAdmin.from('documenti').update({ stato: 'fatturato', metodo_pagamento: pagamentoIncasso }).eq('id', incassoDoc.id)
    // Calcola saldo progressivo
    const saldoPrec = movimenti.length > 0 ? (movimenti[movimenti.length - 1].saldo_progressivo || 0) : 0
    // Inserisci movimento avere nel mastino
    await supabaseAdmin.from('mastino_clienti').insert([{
      user_id: uid, cliente_id: clienteSelezionato.id, cliente_nome: clienteSelezionato.ragione_sociale || `${clienteSelezionato.nome||''} ${clienteSelezionato.cognome||''}`.trim(),
      data_movimento: oggi, tipo_movimento: 'avere',
      causale: `Incasso ${incassoDoc.numero || incassoDoc.id.substring(0,8)} - ${pagamentoIncasso}${noteIncasso ? ' - ' + noteIncasso : ''}`,
      importo_dare: 0, importo_avere: importo, saldo_progressivo: saldoPrec - importo,
      documento_id: incassoDoc.id, numero_doc: incassoDoc.numero, metodo_pagamento: pagamentoIncasso
    }])
    setSuccess(`Incasso registrato: €${importo.toFixed(2)}`)
    setModalIncasso(false)
    setSaving(false)
    await Promise.all([loadMovimenti(clienteSelezionato.id), loadDocumentiAperti(clienteSelezionato.id)])
    setTimeout(() => setSuccess(''), 4000)
  }

  // Ricalcola saldi progressivi
  let saldoRunning = 0
  const movimentiConSaldo = movimenti
    .filter(m => {
      const d = m.data_movimento || ''
      return (!filtroDal || d >= filtroDal) && (!filtroAl || d <= filtroAl)
    })
    .map(m => {
      saldoRunning += (m.dare || 0) - (m.avere || 0)
      return { ...m, _saldo: saldoRunning }
    })

  const totDare = movimentiConSaldo.reduce((s, m) => s + (m.dare || 0), 0)
  const totAvere = movimentiConSaldo.reduce((s, m) => s + (m.avere || 0), 0)
  const saldoFinale = totDare - totAvere

  const clientiFiltrati = clienti.filter(c => {
    const n = (c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`).toLowerCase()
    return n.includes(cerca.toLowerCase()) || c.piva?.includes(cerca) || c.email?.toLowerCase().includes(cerca.toLowerCase())
  })

  const nomeCliente = (c: any) => c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim()

  return (
    <div style={{ display:'flex', height:'calc(100vh - 64px)', background:'#f1f5f9', overflow:'hidden' }}>
      {/* Lista clienti */}
      <div style={{ width:280, background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #e2e8f0' }}>
          <h2 style={{ margin:'0 0 10px 0', fontSize:16, fontWeight:700 }}>Mastrino Clienti</h2>
          <input value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="Cerca cliente..." style={{ ...inp(), width:'100%', boxSizing:'border-box' }}/>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {clientiFiltrati.map(c=>(
            <div key={c.id} onClick={()=>selezionaCliente(c)} style={{ padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid #f8fafc', background:clienteSelezionato?.id===c.id?'#eff6ff':'#fff', borderLeft:clienteSelezionato?.id===c.id?'3px solid #3b82f6':'3px solid transparent' }} onMouseEnter={e=>{ if(clienteSelezionato?.id!==c.id)(e.currentTarget as HTMLElement).style.background='#f8fafc' }} onMouseLeave={e=>{ if(clienteSelezionato?.id!==c.id)(e.currentTarget as HTMLElement).style.background='#fff' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{nomeCliente(c)}</div>
              {c.piva && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>P.IVA: {c.piva}</div>}
              {c.email && <div style={{ fontSize:11, color:'#94a3b8' }}>{c.email}</div>}
            </div>
          ))}
          {clientiFiltrati.length === 0 && <div style={{ padding:20, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Nessun cliente trovato</div>}
        </div>
      </div>

      {/* Contenuto principale */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!clienteSelezionato ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#94a3b8' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>👤</div>
            <div style={{ fontSize:18, fontWeight:600 }}>Seleziona un cliente</div>
            <div style={{ fontSize:14, marginTop:6 }}>Clicca su un cliente a sinistra per vedere il mastrino</div>
          </div>
        ) : (
          <>
            {/* Header cliente */}
            <div style={{ background:'#1e293b', color:'#fff', padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700 }}>{nomeCliente(clienteSelezionato)}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                  {clienteSelezionato.piva && `P.IVA: ${clienteSelezionato.piva} | `}
                  {clienteSelezionato.email || ''} {clienteSelezionato.telefono ? `| Tel: ${clienteSelezionato.telefono}` : ''}
                </div>
              </div>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>DARE</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#f87171' }}>€{totDare.toFixed(2)}</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>AVERE</div>
                  <div style={{ fontSize:18, fontWeight:700, color:'#34d399' }}>€{totAvere.toFixed(2)}</div>
                </div>
                <div style={{ textAlign:'center', background:saldoFinale>0?'#ef4444':saldoFinale<0?'#10b981':'#475569', borderRadius:10, padding:'6px 14px' }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>SALDO</div>
                  <div style={{ fontSize:20, fontWeight:800 }}>€{Math.abs(saldoFinale).toFixed(2)}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.7)' }}>{saldoFinale>0?'DA INCASSARE':saldoFinale<0?'CREDITO':'PARI'}</div>
                </div>
              </div>
            </div>
            {success && <div style={{ background:'#d1fae5', color:'#065f46', padding:'8px 20px', fontSize:13, fontWeight:600 }}>{success}</div>}
            {error && <div style={{ background:'#fee2e2', color:'#991b1b', padding:'8px 20px', fontSize:13 }}>{error}</div>}

            {/* Tab */}
            <div style={{ display:'flex', borderBottom:'2px solid #e2e8f0', background:'#fff', flexShrink:0 }}>
              {[['mastrino','📊 Mastrino Movimenti'],['documenti','📄 Documenti Aperti']].map(([t,label])=>(
                <button key={t} onClick={()=>setTab(t as any)} style={{ padding:'10px 20px', border:'none', cursor:'pointer', fontWeight:tab===t?700:400, background:tab===t?'#eff6ff':'#fff', color:tab===t?'#3b82f6':'#64748b', fontSize:13, borderBottom:tab===t?'2px solid #3b82f6':'2px solid transparent', marginBottom:-2 }}>{label}</button>
              ))}
              {tab === 'mastrino' && (
                <div style={{ marginLeft:'auto', display:'flex', gap:8, padding:'6px 16px', alignItems:'center' }}>
                  <input type="date" value={filtroDal} onChange={e=>setFiltroDal(e.target.value)} style={{ ...inp(), fontSize:12, padding:'4px 8px' }}/>
                  <span style={{ fontSize:12, color:'#64748b' }}>→</span>
                  <input type="date" value={filtroAl} onChange={e=>setFiltroAl(e.target.value)} style={{ ...inp(), fontSize:12, padding:'4px 8px' }}/>
                  <button onClick={()=>{setFiltroDal('');setFiltroAl('')}} style={{ ...btn('#94a3b8',{ padding:'4px 10px', fontSize:11 }) }}>Reset</button>
                </div>
              )}
            </div>

            {/* Contenuto tab */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {loading ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Caricamento...</div> : (
                <>
                  {tab === 'mastrino' && (
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead style={{ position:'sticky', top:0, zIndex:10 }}>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Data','Tipo','Descrizione','Documento','Dare (€)','Avere (€)','Saldo (€)','Pagamento'].map(h=>(
                            <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {movimentiConSaldo.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Nessun movimento nel periodo selezionato</td></tr>
                        ) : movimentiConSaldo.map((m,i)=>(
                          <tr key={m.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                            <td style={{ padding:'8px 12px', fontSize:13, whiteSpace:'nowrap', color:'#64748b' }}>{m.data_movimento}</td>
                            <td style={{ padding:'8px 12px' }}>
                              <span style={{ background:m.tipo_movimento==='incasso'?'#d1fae5':m.tipo_movimento==='vendita'?'#dbeafe':'#f3f4f6', color:m.tipo_movimento==='incasso'?'#065f46':m.tipo_movimento==='vendita'?'#1d4ed8':'#374151', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>
                                {(m.tipo_movimento||'').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding:'8px 12px', fontSize:13 }}>{m.descrizione}</td>
                            <td style={{ padding:'8px 12px', fontSize:12, fontFamily:'monospace', color:'#64748b' }}>{m.documento_numero || '--'}</td>
                            <td style={{ padding:'8px 12px', fontSize:14, fontWeight:m.dare>0?700:400, color:m.dare>0?'#ef4444':'#94a3b8', textAlign:'right' }}>{m.dare>0?`€${Number(m.dare).toFixed(2)}`:'--'}</td>
                            <td style={{ padding:'8px 12px', fontSize:14, fontWeight:m.avere>0?700:400, color:m.avere>0?'#10b981':'#94a3b8', textAlign:'right' }}>{m.avere>0?`€${Number(m.avere).toFixed(2)}`:'--'}</td>
                            <td style={{ padding:'8px 12px', fontSize:14, fontWeight:700, color:m._saldo>0?'#ef4444':m._saldo<0?'#10b981':'#64748b', textAlign:'right' }}>€{Math.abs(m._saldo).toFixed(2)} {m._saldo>0?'D':m._saldo<0?'A':''}</td>
                            <td style={{ padding:'8px 12px', fontSize:12, color:'#64748b' }}>{m.pagamento || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                      {movimentiConSaldo.length > 0 && (
                        <tfoot>
                          <tr style={{ background:'#1e293b', color:'#fff' }}>
                            <td colSpan={4} style={{ padding:'10px 12px', fontSize:13, fontWeight:700 }}>TOTALI</td>
                            <td style={{ padding:'10px 12px', fontSize:15, fontWeight:800, color:'#f87171', textAlign:'right' }}>€{totDare.toFixed(2)}</td>
                            <td style={{ padding:'10px 12px', fontSize:15, fontWeight:800, color:'#34d399', textAlign:'right' }}>€{totAvere.toFixed(2)}</td>
                            <td style={{ padding:'10px 12px', fontSize:15, fontWeight:800, color:saldoFinale>0?'#f87171':saldoFinale<0?'#34d399':'#94a3b8', textAlign:'right' }}>€{Math.abs(saldoFinale).toFixed(2)} {saldoFinale>0?'DA INC.':saldoFinale<0?'CREDITO':''}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  )}

                  {tab === 'documenti' && (
                    <div style={{ padding:20 }}>
                      {documentiAperti.length === 0 ? (
                        <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
                          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                          <div style={{ fontSize:16, fontWeight:600 }}>Nessun documento aperto</div>
                          <div style={{ fontSize:13, marginTop:4 }}>Tutti i documenti di questo cliente sono stati incassati</div>
                        </div>
                      ) : (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
                          {documentiAperti.map(doc=>(
                            <div key={doc.id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:18, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                                <div>
                                  <div style={{ fontSize:15, fontWeight:700, fontFamily:'monospace' }}>{doc.numero || doc.id.substring(0,8)}</div>
                                  <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{(doc.tipo||'').toUpperCase()} | {doc.data_documento}</div>
                                </div>
                                <span style={{ background:doc.stato==='sospeso'?'#fef3c7':doc.stato==='confermato'?'#dbeafe':'#e2e8f0', color:doc.stato==='sospeso'?'#92400e':doc.stato==='confermato'?'#1d4ed8':'#64748b', padding:'3px 10px', borderRadius:6, fontSize:11, fontWeight:600 }}>{(doc.stato||'').toUpperCase()}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid #f1f5f9', paddingTop:12 }}>
                                <div>
                                  <div style={{ fontSize:11, color:'#94a3b8' }}>Imponibile: €{Number(doc.totale_imponibile||0).toFixed(2)} | IVA: €{Number(doc.totale_iva||0).toFixed(2)}</div>
                                  <div style={{ fontSize:22, fontWeight:800, color:'#1e293b', marginTop:2 }}>€{Number(doc.totale_documento||0).toFixed(2)}</div>
                                </div>
                                <button onClick={()=>apriModalIncasso(doc)} style={btn('#10b981',{ padding:'10px 18px', fontSize:14 })}>💳 Incassa</button>
                              </div>
                              {doc.note && <div style={{ marginTop:8, fontSize:12, color:'#64748b', fontStyle:'italic' }}>Note: {doc.note}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal incasso */}
      {modalIncasso && incassoDoc && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:420, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin:'0 0 16px 0', fontSize:18, fontWeight:700 }}>Registra Incasso</h3>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:14, marginBottom:16 }}>
              <div style={{ fontSize:13, color:'#64748b' }}>Documento: <strong>{incassoDoc.numero}</strong></div>
              <div style={{ fontSize:13, color:'#64748b' }}>Cliente: <strong>{incassoDoc.cliente_nome}</strong></div>
              <div style={{ fontSize:20, fontWeight:800, color:'#1e293b', marginTop:6 }}>Totale: €{Number(incassoDoc.totale||0).toFixed(2)}</div>
            </div>
            {error && <div style={{ background:'#fee2e2', color:'#991b1b', padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:13 }}>{error}</div>}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>IMPORTO INCASSATO (€)</label>
              <input type="number" step="0.01" value={importoIncasso} onChange={e=>setImportoIncasso(e.target.value)} style={{ ...inp(), width:'100%', fontSize:20, fontWeight:700, textAlign:'right', boxSizing:'border-box', padding:'10px 12px' }}/>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>MODALITA PAGAMENTO</label>
              <div style={{ display:'flex', gap:6 }}>
                {['contanti','carta','bonifico','assegno','riba'].map(p=>(
                  <button key={p} onClick={()=>setPagamentoIncasso(p)} style={{ flex:1, padding:'7px 4px', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:pagamentoIncasso===p?700:400, background:pagamentoIncasso===p?'#10b981':'#f8fafc', color:pagamentoIncasso===p?'#fff':'#374151', textTransform:'capitalize' }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>NOTE</label>
              <input value={noteIncasso} onChange={e=>setNoteIncasso(e.target.value)} placeholder="Note incasso..." style={{ ...inp(), width:'100%', boxSizing:'border-box' }}/>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setModalIncasso(false)} style={btn('#94a3b8',{ flex:1, padding:'12px' })}>Annulla</button>
              <button onClick={eseguiIncasso} disabled={saving} style={btn('#10b981',{ flex:2, padding:'12px', fontSize:15, opacity:saving?0.5:1 })}>{saving?'Salvataggio...':'✓ Conferma Incasso'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
