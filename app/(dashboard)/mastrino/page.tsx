'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

export default function MastrinoPage() {
  const [clienti, setClienti] = useState<any[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [documenti, setDocumenti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [cercaCliente, setCercaCliente] = useState('')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showRegistraIncasso, setShowRegistraIncasso] = useState(false)
  const [incassoForm, setIncassoForm] = useState({ importo: 0, metodo: 'contanti', data: new Date().toISOString().split('T')[0], note: '', numero_doc: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [view, setView] = useState<'lista_clienti' | 'mastrino'>('lista_clienti')
  const [sintesi, setSintesi] = useState<any[]>([])

  useEffect(() => { loadClienti() }, [])
  useEffect(() => { if (clienteSelezionato) { loadMovimenti(); loadDocumenti() } }, [clienteSelezionato, filtroDal, filtroAl, filtroTipo])

  async function loadClienti() {
    const { data } = await supabaseAdmin.from('clienti').select('*').order('nome')
    setClienti(data || [])
    // Carica sintesi saldi per tutti i clienti
    const { data: movAll } = await supabaseAdmin.from('mastino_clienti').select('cliente_id, cliente_nome, saldo_progressivo, created_at').order('created_at', { ascending: false })
    if (movAll) {
      const map: { [id: string]: any } = {}
      for (const m of movAll) {
        if (!map[m.cliente_id]) map[m.cliente_id] = { cliente_id: m.cliente_id, cliente_nome: m.cliente_nome, saldo: m.saldo_progressivo }
      }
      setSintesi(Object.values(map))
    }
  }

  async function loadMovimenti() {
    setLoading(true)
    let q = supabaseAdmin.from('mastino_clienti').select('*').eq('cliente_id', clienteSelezionato.id).order('data_movimento', { ascending: true })
    if (filtroDal) q = q.gte('data_movimento', filtroDal)
    if (filtroAl) q = q.lte('data_movimento', filtroAl)
    if (filtroTipo) q = q.eq('tipo_movimento', filtroTipo)
    const { data } = await q
    setMovimenti(data || [])
    setLoading(false)
  }

  async function loadDocumenti() {
    const { data } = await supabaseAdmin.from('documenti').select('id, numero_doc, tipo, data_documento, totale_documento, stato').eq('cliente_id', clienteSelezionato.id).order('data_documento', { ascending: false })
    setDocumenti(data || [])
  }

  async function registraIncasso() {
    if (!clienteSelezionato || incassoForm.importo <= 0) { setError('Importo non valido'); return }
    setSaving(true); setError(''); setSuccess('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID

    const { data: lastMov } = await supabaseAdmin.from('mastino_clienti')
      .select('saldo_progressivo').eq('cliente_id', clienteSelezionato.id)
      .order('created_at', { ascending: false }).limit(1)
    const saldoPrecedente = lastMov?.[0]?.saldo_progressivo || 0
    const nuovoSaldo = saldoPrecedente - incassoForm.importo

    await supabaseAdmin.from('mastino_clienti').insert([{
      user_id: uid, cliente_id: clienteSelezionato.id, cliente_nome: clienteSelezionato.nome,
      numero_doc: incassoForm.numero_doc || `INC-${Date.now()}`,
      data_movimento: incassoForm.data,
      causale: `Incasso ${incassoForm.metodo}${incassoForm.note ? ' - ' + incassoForm.note : ''}`,
      tipo_movimento: 'avere', importo_dare: 0, importo_avere: incassoForm.importo,
      saldo_progressivo: nuovoSaldo,
      pagato: true, data_pagamento: incassoForm.data, metodo_pagamento: incassoForm.metodo,
      note: incassoForm.note
    }])

    // Aggiorna scadenzario: segna come pagato
    const { data: scad } = await supabaseAdmin.from('scadenzario')
      .select('*').eq('cliente_id', clienteSelezionato.id).eq('pagato', false).order('data_scadenza')
    let rimanente = incassoForm.importo
    for (const s of (scad || [])) {
      if (rimanente <= 0) break
      const residuo = Number(s.importo_residuo || s.importo)
      if (rimanente >= residuo) {
        await supabaseAdmin.from('scadenzario').update({ pagato: true, importo_pagato: residuo, importo_residuo: 0, data_pagamento: incassoForm.data, metodo_pagamento: incassoForm.metodo }).eq('id', s.id)
        rimanente -= residuo
      } else {
        await supabaseAdmin.from('scadenzario').update({ importo_pagato: (s.importo_pagato || 0) + rimanente, importo_residuo: residuo - rimanente }).eq('id', s.id)
        rimanente = 0
      }
    }

    setSuccess(`✅ Incasso di €${incassoForm.importo.toFixed(2)} registrato! Nuovo saldo: €${nuovoSaldo.toFixed(2)}`)
    setShowRegistraIncasso(false)
    setIncassoForm({ importo: 0, metodo: 'contanti', data: new Date().toISOString().split('T')[0], note: '', numero_doc: '' })
    loadMovimenti(); loadClienti()
    setSaving(false)
    setTimeout(() => setSuccess(''), 4000)
  }

  const totDare = movimenti.reduce((s, m) => s + Number(m.importo_dare || 0), 0)
  const totAvere = movimenti.reduce((s, m) => s + Number(m.importo_avere || 0), 0)
  const saldoFinale = movimenti.length > 0 ? Number(movimenti[movimenti.length - 1].saldo_progressivo || 0) : 0

  // ── LISTA CLIENTI CON SALDI ────────────────────────────────────────────────
  if (view === 'lista_clienti') {
    const clientiConSaldo = clienti.map(c => {
      const s = sintesi.find(x => x.cliente_id === c.id)
      return { ...c, saldo: s?.saldo || 0 }
    }).sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo))

    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: 0 }}>📊 Mastrino Clienti</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0' }}>Estratto conto e movimenti per cliente</p>
          </div>
        </div>

        {/* Sintesi totali */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Clienti con saldo', value: clientiConSaldo.filter(c => c.saldo > 0).length, color: '#ef4444', icon: '⚠️' },
            { label: 'Totale crediti', value: `€${clientiConSaldo.filter(c => c.saldo > 0).reduce((s, c) => s + c.saldo, 0).toFixed(2)}`, color: '#ef4444', icon: '💸' },
            { label: 'Clienti in regola', value: clientiConSaldo.filter(c => c.saldo <= 0).length, color: '#10b981', icon: '✅' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{stat.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Ricerca */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <input value={cercaCliente} onChange={e => setCercaCliente(e.target.value)} placeholder="🔍 Cerca cliente..."
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, width: 300 }} />
        </div>

        {/* Tabella clienti */}
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#1e293b' }}>
              {['Cliente', 'Codice', 'Città', 'P.IVA', 'Saldo', 'Azioni'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {clientiConSaldo.filter(c => !cercaCliente || c.nome?.toLowerCase().includes(cercaCliente.toLowerCase()) || c.codice?.toLowerCase().includes(cercaCliente.toLowerCase())).map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0f9ff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#fafafa'}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>{c.nome}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{c.codice || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.citta || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.piva || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: c.saldo > 0 ? '#ef4444' : c.saldo < 0 ? '#10b981' : '#64748b' }}>
                      {c.saldo > 0 ? '▲' : c.saldo < 0 ? '▼' : '—'} €{Math.abs(c.saldo).toFixed(2)}
                    </span>
                    {c.saldo > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: '#ef4444' }}>da incassare</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => { setClienteSelezionato(c); setView('mastrino') }}
                      style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                      📊 Mastrino
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── MASTRINO CLIENTE ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView('lista_clienti')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>← Tutti i clienti</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>📊 {clienteSelezionato?.nome}</h2>
          <div style={{ fontSize: 13, color: '#64748b' }}>{clienteSelezionato?.citta}{clienteSelezionato?.piva ? ` · P.IVA: ${clienteSelezionato.piva}` : ''}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setShowRegistraIncasso(true)} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700 }}>
            💰 Registra Incasso
          </button>
          <button onClick={() => window.print()} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>🖨️ Stampa</button>
        </div>
      </div>

      {success && <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 16px', marginBottom: 12 }}>{success}</div>}

      {/* Sintesi cliente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Totale Dare', value: `€${totDare.toFixed(2)}`, color: '#ef4444', icon: '📤' },
          { label: 'Totale Avere', value: `€${totAvere.toFixed(2)}`, color: '#10b981', icon: '📥' },
          { label: 'Saldo', value: `€${saldoFinale.toFixed(2)}`, color: saldoFinale > 0 ? '#ef4444' : '#10b981', icon: '⚖️' },
          { label: 'Documenti', value: documenti.length, color: '#3b82f6', icon: '📄' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>FILTRI:</span>
        <input type="date" value={filtroDal} onChange={e => setFiltroDal(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <span style={{ color: '#94a3b8' }}>→</span>
        <input type="date" value={filtroAl} onChange={e => setFiltroAl(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
          <option value="">Tutti i movimenti</option>
          <option value="dare">Solo Dare</option>
          <option value="avere">Solo Avere</option>
        </select>
        <button onClick={() => { setFiltroDal(''); setFiltroAl(''); setFiltroTipo('') }}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>✕ Reset</button>
      </div>

      {/* Estratto conto */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#fff', fontWeight: 700 }}>📋 Estratto Conto — {clienteSelezionato?.nome}</h3>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>{movimenti.length} movimenti</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Data', 'Causale', 'N. Documento', 'Dare (€)', 'Avere (€)', 'Saldo (€)', 'Stato'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: h.includes('€') ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {movimenti.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{m.data_movimento ? new Date(m.data_movimento).toLocaleDateString('it-IT') : '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>{m.causale}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>{m.numero_doc || '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: Number(m.importo_dare) > 0 ? '#ef4444' : '#94a3b8', fontSize: 14 }}>
                  {Number(m.importo_dare) > 0 ? `€${Number(m.importo_dare).toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: Number(m.importo_avere) > 0 ? '#10b981' : '#94a3b8', fontSize: 14 }}>
                  {Number(m.importo_avere) > 0 ? `€${Number(m.importo_avere).toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: Number(m.saldo_progressivo) > 0 ? '#ef4444' : '#10b981' }}>
                  €{Number(m.saldo_progressivo || 0).toFixed(2)}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{
                    borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                    background: m.pagato ? '#d1fae5' : '#fef3c7', color: m.pagato ? '#065f46' : '#92400e'
                  }}>{m.pagato ? '✅ Pagato' : '⏳ Aperto'}</span>
                </td>
              </tr>
            ))}
            {movimenti.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              {loading ? '⏳ Caricamento...' : 'Nessun movimento registrato'}
            </td></tr>}
          </tbody>
          {movimenti.length > 0 && (
            <tfoot><tr style={{ background: '#1e293b' }}>
              <td colSpan={3} style={{ padding: '12px 14px', color: '#fff', fontWeight: 700 }}>TOTALI</td>
              <td style={{ padding: '12px 14px', textAlign: 'right', color: '#fca5a5', fontWeight: 800, fontSize: 15 }}>€{totDare.toFixed(2)}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right', color: '#6ee7b7', fontWeight: 800, fontSize: 15 }}>€{totAvere.toFixed(2)}</td>
              <td style={{ padding: '12px 14px', textAlign: 'right', color: saldoFinale > 0 ? '#fca5a5' : '#6ee7b7', fontWeight: 800, fontSize: 16 }}>€{saldoFinale.toFixed(2)}</td>
              <td></td>
            </tr></tfoot>
          )}
        </table>
      </div>

      {/* Documenti del cliente */}
      {documenti.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>📄 Documenti del cliente</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Tipo', 'Numero', 'Data', 'Totale', 'Stato'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {documenti.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.tipo}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#3b82f6', fontSize: 13 }}>{d.numero_doc}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.data_documento ? new Date(d.data_documento).toLocaleDateString('it-IT') : '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669', fontSize: 14 }}>€{Number(d.totale_documento || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1d4ed8' }}>{d.stato}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL REGISTRA INCASSO */}
      {showRegistraIncasso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>💰 Registra Incasso</h3>
              <button onClick={() => setShowRegistraIncasso(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8' }}>Cliente: {clienteSelezionato?.nome}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Saldo attuale: <strong style={{ color: saldoFinale > 0 ? '#ef4444' : '#10b981' }}>€{saldoFinale.toFixed(2)}</strong></div>
            </div>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>IMPORTO (€) *</label>
                <input type="number" value={incassoForm.importo || ''} onChange={e => setIncassoForm(f => ({ ...f, importo: Number(e.target.value) }))} min={0} step={0.01}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #3b82f6', fontSize: 18, fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>METODO PAGAMENTO</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['contanti', 'carta', 'bonifico', 'assegno', 'pos', 'altro'].map(m => (
                    <button key={m} onClick={() => setIncassoForm(f => ({ ...f, metodo: m }))} style={{
                      padding: '8px', borderRadius: 8, border: `2px solid ${incassoForm.metodo === m ? '#10b981' : '#e2e8f0'}`,
                      background: incassoForm.metodo === m ? '#d1fae5' : '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12
                    }}>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATA INCASSO</label>
                <input type="date" value={incassoForm.data} onChange={e => setIncassoForm(f => ({ ...f, data: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>N. DOCUMENTO / RICEVUTA</label>
                <input value={incassoForm.numero_doc} onChange={e => setIncassoForm(f => ({ ...f, numero_doc: e.target.value }))} placeholder="es: RIC-001"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>NOTE</label>
                <input value={incassoForm.note} onChange={e => setIncassoForm(f => ({ ...f, note: e.target.value }))} placeholder="Note opzionali..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowRegistraIncasso(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
              <button onClick={registraIncasso} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>
                {saving ? '⏳ Salvataggio...' : `✅ Registra €${Number(incassoForm.importo || 0).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
