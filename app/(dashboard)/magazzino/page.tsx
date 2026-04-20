'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

const TIPI_MOVIMENTO = [
  { id: 'carico', label: 'Carico', color: '#10b981', icon: '📥' },
  { id: 'scarico', label: 'Scarico', color: '#ef4444', icon: '📤' },
  { id: 'rettifica', label: 'Rettifica', color: '#f59e0b', icon: '🔧' },
  { id: 'inventario', label: 'Inventario', color: '#8b5cf6', icon: '📋' },
  { id: 'reso', label: 'Reso', color: '#06b6d4', icon: '↩️' },
]

export default function MagazzinoPage() {
  const [view, setView] = useState<'giacenze' | 'movimenti' | 'nuovo_movimento'>('giacenze')
  const [articoli, setArticoli] = useState<any[]>([])
  const [movimenti, setMovimenti] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [cerca, setCerca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [form, setForm] = useState({ articolo_id: '', tipo: 'carico', qta: 1, riferimento: '', note: '', data_movimento: new Date().toISOString().split('T')[0] })
  const [articoloSelezionato, setArticoloSelezionato] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [cercaArticolo, setCercaArticolo] = useState('')
  const [showCercaArticolo, setShowCercaArticolo] = useState(false)

  useEffect(() => { loadArticoli() }, [])
  useEffect(() => { if (view === 'movimenti') loadMovimenti() }, [view, filtroTipo, filtroDal, filtroAl])

  async function loadArticoli() {
    setLoading(true)
    const { data } = await supabaseAdmin.from('articoli').select('*').order('nome')
    setArticoli(data || [])
    setLoading(false)
  }

  async function loadMovimenti() {
    setLoading(true)
    let q = supabaseAdmin.from('magazzino_movimenti').select('*, articoli(nome, codice)').order('data_movimento', { ascending: false })
    if (filtroTipo) q = q.eq('tipo', filtroTipo)
    if (filtroDal) q = q.gte('data_movimento', filtroDal)
    if (filtroAl) q = q.lte('data_movimento', filtroAl)
    const { data } = await q
    setMovimenti(data || [])
    setLoading(false)
  }

  async function salvaMovimento() {
    if (!form.articolo_id || form.qta <= 0) { setError('Seleziona articolo e quantità'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const art = articoli.find(a => a.id === form.articolo_id)
    const stockPrima = art?.stock || 0
    const delta = ['carico', 'reso'].includes(form.tipo) ? form.qta : -form.qta
    const stockDopo = form.tipo === 'rettifica' || form.tipo === 'inventario' ? form.qta : stockPrima + delta
    await supabaseAdmin.from('magazzino_movimenti').insert([{
      user_id: uid, articolo_id: form.articolo_id, tipo: form.tipo,
      qta: form.qta, qta_prima: stockPrima, qta_dopo: stockDopo,
      riferimento: form.riferimento, note: form.note,
      data_movimento: form.data_movimento, created_at: new Date().toISOString()
    }])
    await supabaseAdmin.from('articoli').update({ stock: stockDopo }).eq('id', form.articolo_id)
    setSuccess(`✅ Movimento registrato! ${art?.nome}: ${stockPrima} → ${stockDopo} pz`)
    setForm({ articolo_id: '', tipo: 'carico', qta: 1, riferimento: '', note: '', data_movimento: new Date().toISOString().split('T')[0] })
    setArticoloSelezionato(null)
    loadArticoli()
    setSaving(false)
    setTimeout(() => setSuccess(''), 4000)
  }

  const artFiltrati = articoli.filter(a =>
    !cerca || a.nome?.toLowerCase().includes(cerca.toLowerCase()) ||
    a.codice?.toLowerCase().includes(cerca.toLowerCase()) || a.ean?.includes(cerca)
  )
  const artCercaModal = articoli.filter(a =>
    !cercaArticolo || a.nome?.toLowerCase().includes(cercaArticolo.toLowerCase()) ||
    a.codice?.toLowerCase().includes(cercaArticolo.toLowerCase())
  )
  const totArticoli = articoli.length
  const sottoScorta = articoli.filter(a => (a.stock || 0) <= (a.scorta_minima || 5) && (a.stock || 0) > 0).length
  const esauriti = articoli.filter(a => (a.stock || 0) <= 0).length
  const valMagazzino = articoli.reduce((s, a) => s + (a.stock || 0) * (a.prezzo_base || 0), 0)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: 0 }}>🏭 Magazzino</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Giacenze, movimentazioni e inventario</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{id:'giacenze',label:'📦 Giacenze'},{id:'movimenti',label:'📋 Movimenti'},{id:'nuovo_movimento',label:'+ Nuovo Movimento'}].map(v => (
            <button key={v.id} onClick={() => setView(v.id as any)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: view === v.id ? '#3b82f6' : '#f1f5f9', color: view === v.id ? '#fff' : '#374151'
            }}>{v.label}</button>
          ))}
        </div>
      </div>
      {success && <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>{success}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Articoli totali', value: totArticoli, color: '#3b82f6', icon: '📦' },
          { label: 'Sotto scorta', value: sottoScorta, color: '#f59e0b', icon: '⚠️' },
          { label: 'Esauriti', value: esauriti, color: '#ef4444', icon: '🔴' },
          { label: 'Valore magazzino', value: `€${valMagazzino.toFixed(0)}`, color: '#10b981', icon: '💰' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>
      {view === 'giacenze' && (
        <>
          <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input value={cerca} onChange={e => setCerca(e.target.value)} placeholder="🔍 Cerca articolo per nome, codice o EAN..."
              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, minWidth: 300 }} />
            <div style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}><strong>{artFiltrati.length}</strong> articoli</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#1e293b' }}>
                {['Codice','Articolo','EAN','Scorta','Prezzo Base','Valore','Stato'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {artFiltrati.map((a, i) => {
                  const stock = a.stock || 0
                  const scorta = a.scorta_minima || 5
                  const stato = stock <= 0 ? 'esaurito' : stock <= scorta ? 'sotto_scorta' : 'disponibile'
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', background: stato === 'esaurito' ? '#fef2f2' : stato === 'sotto_scorta' ? '#fffbeb' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#64748b' }}>{a.codice || '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{a.nome}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8' }}>{a.ean || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 800, fontSize: 16, color: stato === 'esaurito' ? '#ef4444' : stato === 'sotto_scorta' ? '#f59e0b' : '#10b981' }}>{stock}</span>
                        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>pz</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>€{Number(a.prezzo_base || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#059669', fontSize: 13 }}>€{(stock * Number(a.prezzo_base || 0)).toFixed(2)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                          background: stato === 'esaurito' ? '#fee2e2' : stato === 'sotto_scorta' ? '#fef3c7' : '#d1fae5',
                          color: stato === 'esaurito' ? '#dc2626' : stato === 'sotto_scorta' ? '#92400e' : '#065f46'
                        }}>{stato === 'esaurito' ? 'Esaurito' : stato === 'sotto_scorta' ? 'Sotto scorta' : 'Disponibile'}</span>
                      </td>
                    </tr>
                  )
                })}
                {artFiltrati.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{loading ? '⏳ Caricamento...' : 'Nessun articolo trovato'}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {view === 'movimenti' && (
        <>
          <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
              <option value="">Tutti i tipi</option>
              {TIPI_MOVIMENTO.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
            <input type="date" value={filtroDal} onChange={e => setFiltroDal(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
            <span style={{ color: '#94a3b8' }}>→</span>
            <input type="date" value={filtroAl} onChange={e => setFiltroAl(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
            <button onClick={() => { setFiltroTipo(''); setFiltroDal(''); setFiltroAl('') }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>✕ Reset</button>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#1e293b' }}>
                {['Data','Tipo','Articolo','Qta','Prima','Dopo','Riferimento','Note'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {movimenti.map((m, i) => {
                  const tipo = TIPI_MOVIMENTO.find(t => t.id === m.tipo)
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{m.data_movimento ? new Date(m.data_movimento).toLocaleDateString('it-IT') : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: (tipo?.color || '#94a3b8') + '20', color: tipo?.color || '#94a3b8', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{tipo?.icon} {tipo?.label || m.tipo}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{m.articoli?.nome || '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: 15, color: ['carico','reso'].includes(m.tipo) ? '#10b981' : '#ef4444' }}>
                        {['carico','reso'].includes(m.tipo) ? '+' : '-'}{m.qta}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>{m.qta_prima}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13 }}>{m.qta_dopo}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>{m.riferimento || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{m.note || '—'}</td>
                    </tr>
                  )
                })}
                {movimenti.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{loading ? '⏳ Caricamento...' : 'Nessun movimento trovato'}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      {view === 'nuovo_movimento' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 24px', fontWeight: 800, fontSize: 20, color: '#1e293b' }}>📦 Nuovo Movimento Magazzino</h3>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>TIPO MOVIMENTO</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TIPI_MOVIMENTO.map(t => (
                  <button key={t.id} onClick={() => setForm(f => ({ ...f, tipo: t.id }))} style={{
                    padding: '8px 16px', borderRadius: 8, border: `2px solid ${form.tipo === t.id ? t.color : '#e2e8f0'}`,
                    background: form.tipo === t.id ? t.color + '15' : '#fff', cursor: 'pointer',
                    fontWeight: 700, fontSize: 13, color: form.tipo === t.id ? t.color : '#374151'
                  }}>{t.icon} {t.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>ARTICOLO *</label>
              {articoloSelezionato ? (
                <div style={{ background: '#eff6ff', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{articoloSelezionato.nome}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Cod: {articoloSelezionato.codice} · Stock: <strong>{articoloSelezionato.stock || 0} pz</strong></div>
                  </div>
                  <button onClick={() => { setArticoloSelezionato(null); setForm(f => ({ ...f, articolo_id: '' })) }}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>Cambia</button>
                </div>
              ) : (
                <button onClick={() => setShowCercaArticolo(true)} style={{ width: '100%', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 10, padding: '14px', cursor: 'pointer', color: '#3b82f6', fontWeight: 600, fontSize: 14 }}>
                  + Seleziona Articolo
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>QUANTITÀ *</label>
                <input type="number" value={form.qta || ''} onChange={e => setForm(f => ({ ...f, qta: Number(e.target.value) }))} min={0}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '2px solid #3b82f6', fontSize: 18, fontWeight: 700, textAlign: 'right', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATA</label>
                <input type="date" value={form.data_movimento} onChange={e => setForm(f => ({ ...f, data_movimento: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>RIFERIMENTO</label>
              <input value={form.riferimento} onChange={e => setForm(f => ({ ...f, riferimento: e.target.value }))} placeholder="es: DDT-001, OA-2024-001..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>NOTE</label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            {articoloSelezionato && form.qta > 0 && (
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Anteprima:</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{articoloSelezionato.stock || 0} pz</span>
                  <span style={{ color: '#64748b' }}>→</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: ['carico','reso'].includes(form.tipo) ? '#10b981' : '#ef4444' }}>
                    {form.tipo === 'rettifica' || form.tipo === 'inventario' ? form.qta : Math.max(0, (articoloSelezionato.stock || 0) + (['carico','reso'].includes(form.tipo) ? form.qta : -form.qta))} pz
                  </span>
                </div>
              </div>
            )}
            <button onClick={salvaMovimento} disabled={saving || !form.articolo_id} style={{
              width: '100%', padding: '14px', borderRadius: 10, border: 'none',
              background: !form.articolo_id ? '#e2e8f0' : '#3b82f6', color: !form.articolo_id ? '#94a3b8' : '#fff',
              fontWeight: 800, fontSize: 16, cursor: !form.articolo_id ? 'not-allowed' : 'pointer'
            }}>{saving ? '⏳ Salvataggio...' : '✅ Registra Movimento'}</button>
          </div>
        </div>
      )}
      {showCercaArticolo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 560, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Seleziona Articolo</h3>
              <button onClick={() => setShowCercaArticolo(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <input value={cercaArticolo} onChange={e => setCercaArticolo(e.target.value)} placeholder="🔍 Cerca..." autoFocus
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 12 }} />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {artCercaModal.slice(0, 40).map(a => (
                <button key={a.id} onClick={() => { setArticoloSelezionato(a); setForm(f => ({ ...f, articolo_id: a.id })); setShowCercaArticolo(false); setCercaArticolo('') }}
                  style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#eff6ff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.nome}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Cod: {a.codice || '—'}</div>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 16, color: (a.stock || 0) > 0 ? '#10b981' : '#ef4444' }}>{a.stock || 0} pz</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
