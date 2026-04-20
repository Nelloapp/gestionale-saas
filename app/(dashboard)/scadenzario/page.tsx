'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

export default function ScadenzarioPage() {
  const [scadenze, setScadenze] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [showIncasso, setShowIncasso] = useState<any>(null)
  const [incassoForm, setIncassoForm] = useState({ importo: 0, metodo: 'contanti', data: new Date().toISOString().split('T')[0], note: '' })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => { loadScadenze() }, [filtroStato, filtroCliente, filtroDal, filtroAl])

  async function loadScadenze() {
    setLoading(true)
    let q = supabaseAdmin.from('scadenzario').select('*').order('data_scadenza', { ascending: true })
    if (filtroStato === 'aperte') q = q.eq('pagato', false)
    if (filtroStato === 'pagate') q = q.eq('pagato', true)
    if (filtroStato === 'scadute') q = q.eq('pagato', false).lt('data_scadenza', new Date().toISOString().split('T')[0])
    if (filtroCliente) q = q.ilike('cliente_nome', `%${filtroCliente}%`)
    if (filtroDal) q = q.gte('data_scadenza', filtroDal)
    if (filtroAl) q = q.lte('data_scadenza', filtroAl)
    const { data } = await q
    setScadenze(data || [])
    setLoading(false)
  }

  async function registraIncassoSingolo(scad: any) {
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const importoPagato = incassoForm.importo > 0 ? incassoForm.importo : Number(scad.importo_residuo || scad.importo)
    const residuo = Number(scad.importo_residuo || scad.importo) - importoPagato
    const pagato = residuo <= 0

    await supabaseAdmin.from('scadenzario').update({
      pagato, importo_pagato: (Number(scad.importo_pagato) || 0) + importoPagato,
      importo_residuo: Math.max(0, residuo),
      data_pagamento: incassoForm.data, metodo_pagamento: incassoForm.metodo
    }).eq('id', scad.id)

    // Aggiorna mastino
    const { data: lastMov } = await supabaseAdmin.from('mastino_clienti')
      .select('saldo_progressivo').eq('cliente_id', scad.cliente_id)
      .order('created_at', { ascending: false }).limit(1)
    const saldoPrecedente = lastMov?.[0]?.saldo_progressivo || 0

    await supabaseAdmin.from('mastino_clienti').insert([{
      user_id: uid, cliente_id: scad.cliente_id, cliente_nome: scad.cliente_nome,
      documento_id: scad.documento_id, numero_doc: scad.numero_doc,
      data_movimento: incassoForm.data,
      causale: `Incasso ${incassoForm.metodo} - Rif. ${scad.numero_doc}${incassoForm.note ? ' - ' + incassoForm.note : ''}`,
      tipo_movimento: 'avere', importo_dare: 0, importo_avere: importoPagato,
      saldo_progressivo: saldoPrecedente - importoPagato,
      pagato: true, data_pagamento: incassoForm.data, metodo_pagamento: incassoForm.metodo
    }])

    setSuccess(`✅ Incasso €${importoPagato.toFixed(2)} registrato!`)
    setShowIncasso(null)
    setIncassoForm({ importo: 0, metodo: 'contanti', data: new Date().toISOString().split('T')[0], note: '' })
    loadScadenze()
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  async function incassaSelezionate() {
    if (selected.size === 0) return
    const scadSelezionate = scadenze.filter(s => selected.has(s.id) && !s.pagato)
    for (const s of scadSelezionate) {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || USER_ID
      await supabaseAdmin.from('scadenzario').update({ pagato: true, importo_pagato: s.importo, importo_residuo: 0, data_pagamento: new Date().toISOString().split('T')[0], metodo_pagamento: 'contanti' }).eq('id', s.id)
      const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', s.cliente_id).order('created_at', { ascending: false }).limit(1)
      const saldoPrecedente = lastMov?.[0]?.saldo_progressivo || 0
      await supabaseAdmin.from('mastino_clienti').insert([{
        user_id: uid, cliente_id: s.cliente_id, cliente_nome: s.cliente_nome,
        numero_doc: s.numero_doc, data_movimento: new Date().toISOString().split('T')[0],
        causale: `Incasso contanti - Rif. ${s.numero_doc}`,
        tipo_movimento: 'avere', importo_dare: 0, importo_avere: Number(s.importo),
        saldo_progressivo: saldoPrecedente - Number(s.importo), pagato: true,
        data_pagamento: new Date().toISOString().split('T')[0], metodo_pagamento: 'contanti'
      }])
    }
    setSelected(new Set())
    setSuccess(`✅ ${scadSelezionate.length} scadenze incassate!`)
    loadScadenze()
    setTimeout(() => setSuccess(''), 3000)
  }

  const oggi = new Date().toISOString().split('T')[0]
  const scadFiltrate = scadenze
  const totAperte = scadFiltrate.filter(s => !s.pagato).reduce((t, s) => t + Number(s.importo_residuo || s.importo), 0)
  const totScadute = scadFiltrate.filter(s => !s.pagato && s.data_scadenza < oggi).reduce((t, s) => t + Number(s.importo_residuo || s.importo), 0)
  const totPagate = scadFiltrate.filter(s => s.pagato).reduce((t, s) => t + Number(s.importo), 0)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: 0 }}>📅 Scadenzario</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Gestione scadenze e registrazione incassi</p>
        </div>
        {selected.size > 0 && (
          <button onClick={incassaSelezionate} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            ✅ Incassa selezionate ({selected.size})
          </button>
        )}
      </div>

      {success && <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>{success}</div>}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Da incassare', value: `€${totAperte.toFixed(2)}`, color: '#f59e0b', icon: '⏳', bg: '#fffbeb' },
          { label: 'Scadute', value: `€${totScadute.toFixed(2)}`, color: '#ef4444', icon: '🔴', bg: '#fef2f2' },
          { label: 'Incassate', value: `€${totPagate.toFixed(2)}`, color: '#10b981', icon: '✅', bg: '#f0fdf4' },
          { label: 'Totale scadenze', value: scadFiltrate.length, color: '#3b82f6', icon: '📋', bg: '#eff6ff' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '18px 20px', border: `1px solid ${s.color}30` }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { id: 'tutti', label: 'Tutte' },
          { id: 'aperte', label: '⏳ Aperte' },
          { id: 'scadute', label: '🔴 Scadute' },
          { id: 'pagate', label: '✅ Pagate' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltroStato(f.id)} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: filtroStato === f.id ? '#3b82f6' : '#f1f5f9', color: filtroStato === f.id ? '#fff' : '#374151'
          }}>{f.label}</button>
        ))}
        <div style={{ width: 1, height: 24, background: '#e2e8f0', margin: '0 4px' }} />
        <input value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} placeholder="🔍 Cliente..."
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, minWidth: 150 }} />
        <input type="date" value={filtroDal} onChange={e => setFiltroDal(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <span style={{ color: '#94a3b8', fontSize: 13 }}>→</span>
        <input type="date" value={filtroAl} onChange={e => setFiltroAl(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <button onClick={() => { setFiltroStato('tutti'); setFiltroCliente(''); setFiltroDal(''); setFiltroAl('') }}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>✕ Reset</button>
      </div>

      {/* Tabella scadenze */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#1e293b' }}>
            <th style={{ padding: '12px 14px', width: 40 }}>
              <input type="checkbox" onChange={e => {
                if (e.target.checked) setSelected(new Set(scadFiltrate.filter(s => !s.pagato).map(s => s.id)))
                else setSelected(new Set())
              }} />
            </th>
            {['Scadenza', 'Cliente', 'N. Documento', 'Importo', 'Pagato', 'Residuo', 'Metodo', 'Stato', 'Azioni'].map(h => (
              <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {scadFiltrate.map((s, i) => {
              const scaduta = !s.pagato && s.data_scadenza < oggi
              const inScadenza = !s.pagato && s.data_scadenza >= oggi && s.data_scadenza <= new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: scaduta ? '#fef2f2' : inScadenza ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px' }}>
                    {!s.pagato && <input type="checkbox" checked={selected.has(s.id)} onChange={e => {
                      const ns = new Set(selected)
                      if (e.target.checked) ns.add(s.id); else ns.delete(s.id)
                      setSelected(ns)
                    }} />}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: scaduta ? '#dc2626' : '#1e293b' }}>
                    {s.data_scadenza ? new Date(s.data_scadenza).toLocaleDateString('it-IT') : '—'}
                    {scaduta && <span style={{ marginLeft: 6, fontSize: 11, color: '#ef4444' }}>SCADUTA</span>}
                    {inScadenza && <span style={{ marginLeft: 6, fontSize: 11, color: '#f59e0b' }}>⚠️ In scadenza</span>}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>{s.cliente_nome}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>{s.numero_doc || '—'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 14 }}>€{Number(s.importo || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#10b981' }}>
                    {Number(s.importo_pagato || 0) > 0 ? `€${Number(s.importo_pagato).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 14, color: Number(s.importo_residuo) > 0 ? '#ef4444' : '#10b981' }}>
                    €{Number(s.importo_residuo || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>{s.metodo_pagamento || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                      background: s.pagato ? '#d1fae5' : scaduta ? '#fee2e2' : '#fef3c7',
                      color: s.pagato ? '#065f46' : scaduta ? '#dc2626' : '#92400e'
                    }}>{s.pagato ? '✅ Pagata' : scaduta ? '🔴 Scaduta' : '⏳ Aperta'}</span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {!s.pagato && (
                      <button onClick={() => { setShowIncasso(s); setIncassoForm(f => ({ ...f, importo: Number(s.importo_residuo || s.importo) })) }}
                        style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                        💰 Incassa
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {scadFiltrate.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              {loading ? '⏳ Caricamento...' : 'Nessuna scadenza trovata'}
            </td></tr>}
          </tbody>
        </table>
      </div>

      {/* MODAL INCASSO */}
      {showIncasso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>💰 Registra Incasso</h3>
              <button onClick={() => setShowIncasso(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>{showIncasso.cliente_nome}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>Rif: {showIncasso.numero_doc} · Scadenza: {showIncasso.data_scadenza ? new Date(showIncasso.data_scadenza).toLocaleDateString('it-IT') : '—'}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginTop: 4 }}>Residuo: €{Number(showIncasso.importo_residuo || showIncasso.importo).toFixed(2)}</div>
            </div>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>IMPORTO (€)</label>
                <input type="number" value={incassoForm.importo || ''} onChange={e => setIncassoForm(f => ({ ...f, importo: Number(e.target.value) }))} min={0} step={0.01}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #3b82f6', fontSize: 18, fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>METODO</label>
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
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATA</label>
                <input type="date" value={incassoForm.data} onChange={e => setIncassoForm(f => ({ ...f, data: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>NOTE</label>
                <input value={incassoForm.note} onChange={e => setIncassoForm(f => ({ ...f, note: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowIncasso(null)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
              <button onClick={() => registraIncassoSingolo(showIncasso)} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 15 }}>
                {saving ? '⏳...' : `✅ Incassa €${Number(incassoForm.importo || 0).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
