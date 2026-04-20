'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

const CONTI_DARE = ['Crediti v/Clienti','Banca c/c','Cassa','Erario c/IVA','Debiti v/Fornitori','Costi di Acquisto','Spese Generali']
const CONTI_AVERE = ['Ricavi di Vendita','Banca c/c','Cassa','IVA a Debito','Crediti v/Clienti','Debiti v/Fornitori','Capitale Sociale']
const TIPI_REG = ['vendita','incasso','acquisto','pagamento','giroconto','rettifica','apertura','chiusura']
const TIPI_COLORE: Record<string,{bg:string,color:string}> = {
  vendita:    {bg:'#dbeafe',color:'#1d4ed8'},
  incasso:    {bg:'#d1fae5',color:'#065f46'},
  acquisto:   {bg:'#fef3c7',color:'#92400e'},
  pagamento:  {bg:'#fee2e2',color:'#991b1b'},
  giroconto:  {bg:'#ede9fe',color:'#5b21b6'},
  rettifica:  {bg:'#f1f5f9',color:'#475569'},
  apertura:   {bg:'#cffafe',color:'#155e75'},
  chiusura:   {bg:'#fce7f3',color:'#9d174d'},
}

const inp = (extra?: any): any => ({ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff', ...extra })
const btn = (bg: string, extra?: any): any => ({ background:bg, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13, ...extra })

export default function PartitaDoppiaPage() {
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Filtri
  const [filtroCerca, setFiltroCerca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('tutti')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')

  // Form nuova registrazione
  const [dataReg, setDataReg] = useState(new Date().toISOString().split('T')[0])
  const [causale, setCausale] = useState('')
  const [tipo, setTipo] = useState('vendita')
  const [contoDare, setContoDare] = useState('Crediti v/Clienti')
  const [contoAvere, setContoAvere] = useState('Ricavi di Vendita')
  const [importoDare, setImportoDare] = useState('')
  const [importoAvere, setImportoAvere] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [cercaCliente, setCercaCliente] = useState('')
  const [showClienti, setShowClienti] = useState(false)
  const [noteReg, setNoteReg] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: movs }, { data: cls }] = await Promise.all([
      supabaseAdmin.from('partita_doppia').select('*').order('data_movimento', { ascending: false }).order('created_at', { ascending: false }),
      supabaseAdmin.from('clienti').select('id, nome, cognome, ragione_sociale').order('nome'),
    ])
    setMovimenti(movs || [])
    setClienti(cls || [])
    setLoading(false)
  }

  async function salvaRegistrazione() {
    if (!causale.trim()) { setError('Inserisci la causale'); return }
    const dare = parseFloat(importoDare) || 0
    const avere = parseFloat(importoAvere) || 0
    if (dare === 0 && avere === 0) { setError('Inserisci almeno un importo'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const anno = new Date().getFullYear()
    const { count } = await supabaseAdmin.from('partita_doppia').select('*', { count: 'exact', head: true }).gte('created_at', anno + '-01-01')
    const numReg = `${anno}-REG-${String((count || 0) + 1).padStart(5, '0')}`
    const { error: e } = await supabaseAdmin.from('partita_doppia').insert([{
      user_id: uid, data_movimento: dataReg, numero_registrazione: numReg,
      causale, tipo, conto_dare: contoDare, conto_avere: contoAvere,
      importo_dare: dare, importo_avere: avere,
      cliente_id: clienteId || null, cliente_nome: clienteNome || null,
      note: noteReg || null,
    }])
    if (e) { setError('Errore: ' + e.message); setSaving(false); return }
    setSuccess('Registrazione salvata!'); setTimeout(() => setSuccess(''), 3000)
    setShowForm(false); resetForm(); loadAll(); setSaving(false)
  }

  function resetForm() {
    setDataReg(new Date().toISOString().split('T')[0]); setCausale(''); setTipo('vendita')
    setContoDare('Crediti v/Clienti'); setContoAvere('Ricavi di Vendita')
    setImportoDare(''); setImportoAvere(''); setClienteId(''); setClienteNome(''); setCercaCliente(''); setNoteReg('')
  }

  async function eliminaReg(id: string) {
    if (!confirm('Eliminare questa registrazione?')) return
    await supabaseAdmin.from('partita_doppia').delete().eq('id', id)
    loadAll()
  }

  const clientiFiltrati = clienti.filter(c => {
    const n = (c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`).toLowerCase()
    return n.includes(cercaCliente.toLowerCase())
  }).slice(0, 8)

  const movFiltrati = movimenti.filter(m => {
    const matchTipo = filtroTipo === 'tutti' || m.tipo === filtroTipo
    const matchCerca = !filtroCerca || m.causale?.toLowerCase().includes(filtroCerca.toLowerCase()) || m.numero_registrazione?.toLowerCase().includes(filtroCerca.toLowerCase()) || m.cliente_nome?.toLowerCase().includes(filtroCerca.toLowerCase())
    const matchCliente = !filtroCliente || m.cliente_nome?.toLowerCase().includes(filtroCliente.toLowerCase())
    const matchDal = !filtroDal || m.data_movimento >= filtroDal
    const matchAl = !filtroAl || m.data_movimento <= filtroAl
    return matchTipo && matchCerca && matchCliente && matchDal && matchAl
  })

  const totDare = movFiltrati.reduce((s, m) => s + Number(m.importo_dare || 0), 0)
  const totAvere = movFiltrati.reduce((s, m) => s + Number(m.importo_avere || 0), 0)
  const saldo = totDare - totAvere

  return (
    <div style={{ padding: '20px 24px', background: '#f1f5f9', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>Partita Doppia</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Registro contabile con movimenti dare e avere</p>
        </div>
        <button onClick={() => { setShowForm(true); resetForm() }} style={btn('#1e293b', { padding: '10px 20px', fontSize: 14 })}>+ Nuova Registrazione</button>
      </div>

      {/* Totali */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: 1 }}>TOTALE DARE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>EUR {totDare.toFixed(2)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: 1 }}>TOTALE AVERE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>EUR {totAvere.toFixed(2)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${saldo >= 0 ? '#3b82f6' : '#f59e0b'}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, letterSpacing: 1 }}>SALDO</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: saldo >= 0 ? '#3b82f6' : '#f59e0b' }}>EUR {Math.abs(saldo).toFixed(2)} {saldo >= 0 ? 'D' : 'A'}</div>
        </div>
      </div>

      {/* Filtri */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 160 }}><label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>CERCA</label><input style={inp()} value={filtroCerca} onChange={e => setFiltroCerca(e.target.value)} placeholder="Causale, numero, cliente..." /></div>
        <div style={{ minWidth: 140 }}><label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>TIPO</label>
          <select style={inp()} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="tutti">Tutti</option>
            {TIPI_REG.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 160 }}><label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>CLIENTE</label><input style={inp()} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} placeholder="Filtra per cliente..." /></div>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>DAL</label><input type="date" style={inp({ minWidth: 130 })} value={filtroDal} onChange={e => setFiltroDal(e.target.value)} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>AL</label><input type="date" style={inp({ minWidth: 130 })} value={filtroAl} onChange={e => setFiltroAl(e.target.value)} /></div>
        <button onClick={() => { setFiltroCerca(''); setFiltroTipo('tutti'); setFiltroDal(''); setFiltroAl(''); setFiltroCliente('') }} style={btn('#94a3b8', { padding: '8px 14px', fontSize: 12 })}>Reset</button>
        <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', fontWeight: 600 }}>{movFiltrati.length} reg.</span>
      </div>

      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>{success}</div>}

      {/* Tabella partita doppia */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Caricamento...</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['N. Reg.', 'Data', 'Tipo', 'Causale', 'Cliente', 'Conto DARE', 'Importo DARE', 'Conto AVERE', 'Importo AVERE', ''].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movFiltrati.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nessuna registrazione trovata</td></tr>
                ) : movFiltrati.map((m, i) => {
                  const tc = TIPI_COLORE[m.tipo] || { bg: '#f1f5f9', color: '#64748b' }
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>{m.numero_registrazione || '--'}</td>
                      <td style={{ padding: '9px 12px', fontSize: 13, whiteSpace: 'nowrap' }}>{m.data_movimento}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ background: tc.bg, color: tc.color, padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{m.tipo?.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.causale}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: '#64748b', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.cliente_nome || '--'}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: '#ef4444', fontWeight: 500 }}>{m.conto_dare}</td>
                      <td style={{ padding: '9px 12px', fontSize: 14, fontWeight: 700, color: '#ef4444', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {Number(m.importo_dare) > 0 ? `EUR ${Number(m.importo_dare).toFixed(2)}` : '--'}
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: '#10b981', fontWeight: 500 }}>{m.conto_avere}</td>
                      <td style={{ padding: '9px 12px', fontSize: 14, fontWeight: 700, color: '#10b981', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {Number(m.importo_avere) > 0 ? `EUR ${Number(m.importo_avere).toFixed(2)}` : '--'}
                      </td>
                      <td style={{ padding: '9px 8px' }}>
                        <button onClick={() => eliminaReg(m.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Elimina</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {movFiltrati.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td colSpan={6} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#64748b' }}>TOTALI ({movFiltrati.length} registrazioni)</td>
                    <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 800, color: '#ef4444', textAlign: 'right' }}>EUR {totDare.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px' }}></td>
                    <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 800, color: '#10b981', textAlign: 'right' }}>EUR {totAvere.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Modal nuova registrazione */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', borderRadius: '16px 16px 0 0' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Nuova Registrazione Contabile</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer', padding: 0 }}>x</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>DATA REGISTRAZIONE</label>
                  <input type="date" style={inp()} value={dataReg} onChange={e => setDataReg(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>TIPO OPERAZIONE</label>
                  <select style={inp()} value={tipo} onChange={e => {
                    setTipo(e.target.value)
                    if (e.target.value === 'incasso') { setContoDare('Cassa'); setContoAvere('Crediti v/Clienti') }
                    else if (e.target.value === 'vendita') { setContoDare('Crediti v/Clienti'); setContoAvere('Ricavi di Vendita') }
                    else if (e.target.value === 'acquisto') { setContoDare('Costi di Acquisto'); setContoAvere('Debiti v/Fornitori') }
                    else if (e.target.value === 'pagamento') { setContoDare('Debiti v/Fornitori'); setContoAvere('Banca c/c') }
                  }}>
                    {TIPI_REG.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>CAUSALE *</label>
                <input style={inp()} value={causale} onChange={e => setCausale(e.target.value)} placeholder="Es: Fattura n. 2026-FT-00001, Incasso cliente Rossi..." />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>CLIENTE (opzionale)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    value={clienteNome || cercaCliente}
                    onChange={e => { setCercaCliente(e.target.value); if (clienteNome) { setClienteId(''); setClienteNome('') } setShowClienti(true) }}
                    onFocus={() => setShowClienti(true)}
                    onBlur={() => setTimeout(() => setShowClienti(false), 200)}
                    placeholder="Cerca cliente..."
                    style={inp()}
                  />
                  {showClienti && clientiFiltrati.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 180, overflowY: 'auto' }}>
                      {clientiFiltrati.map(c => (
                        <div key={c.id} onMouseDown={() => { setClienteId(c.id); setClienteNome(c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`.trim()); setCercaCliente(''); setShowClienti(false) }} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                          {c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`.trim()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sezione dare/avere */}
              <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 12, letterSpacing: 1 }}>REGISTRAZIONE CONTABILE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: 4 }}>CONTO DARE</label>
                    <select style={{ ...inp(), borderColor: '#fca5a5', color: '#ef4444', fontWeight: 600 }} value={contoDare} onChange={e => setContoDare(e.target.value)}>
                      {CONTI_DARE.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__custom">Altro...</option>
                    </select>
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', display: 'block', marginBottom: 4 }}>IMPORTO DARE</label>
                      <input type="number" step="0.01" style={{ ...inp(), borderColor: '#fca5a5', fontSize: 16, fontWeight: 700, color: '#ef4444', textAlign: 'right' }} value={importoDare} onChange={e => { setImportoDare(e.target.value); setImportoAvere(e.target.value) }} placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#94a3b8', paddingBottom: 8, textAlign: 'center' }}>{'='}</div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#10b981', display: 'block', marginBottom: 4 }}>CONTO AVERE</label>
                    <select style={{ ...inp(), borderColor: '#6ee7b7', color: '#10b981', fontWeight: 600 }} value={contoAvere} onChange={e => setContoAvere(e.target.value)}>
                      {CONTI_AVERE.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__custom">Altro...</option>
                    </select>
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#10b981', display: 'block', marginBottom: 4 }}>IMPORTO AVERE</label>
                      <input type="number" step="0.01" style={{ ...inp(), borderColor: '#6ee7b7', fontSize: 16, fontWeight: 700, color: '#10b981', textAlign: 'right' }} value={importoAvere} onChange={e => setImportoAvere(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
                  <strong>Registrazione:</strong> {contoDare} a {contoAvere} — EUR {parseFloat(importoDare || '0').toFixed(2)}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>NOTE</label>
                <textarea style={{ ...inp(), height: 60, resize: 'none' }} value={noteReg} onChange={e => setNoteReg(e.target.value)} placeholder="Note aggiuntive..." />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Annulla</button>
                <button onClick={salvaRegistrazione} disabled={saving} style={btn('#1e293b', { padding: '10px 24px', fontSize: 14 })}>{saving ? 'Salvataggio...' : 'Salva Registrazione'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
