'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'


type Articolo = {
  id?: string; codice: string; ean: string; codice_fornitore: string; nome: string;
  descrizione: string; categoria: string; sottocategoria: string; um: string;
  costo: number; ricarica: number; prezzo_base: number; prezzo_premium: number;
  prezzo_rivenditori: number; iva: number; stock: number; stock_minimo: number;
  stock_massimo: number; ubicazione: string; fornitore: string; tempo_riordino: number;
  peso: number; dimensioni: string; stato: string; note: string;
}

const emptyForm: Articolo = {
  codice: '', ean: '', codice_fornitore: '', nome: '', descrizione: '',
  categoria: '', sottocategoria: '', um: 'pz', costo: 0, ricarica: 0,
  prezzo_base: 0, prezzo_premium: 0, prezzo_rivenditori: 0, iva: 22,
  stock: 0, stock_minimo: 0, stock_massimo: 0, ubicazione: '', fornitore: '',
  tempo_riordino: 0, peso: 0, dimensioni: '', stato: 'attivo', note: ''
}

export default function ArticoliPage() {
  const [articoli, setArticoli] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Articolo>(emptyForm)
  const [tabForm, setTabForm] = useState('dati')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [cerca, setCerca] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadArticoli() }, [])

  async function loadArticoli() {
    setLoading(true)
    const { data, error } = await supabaseAdmin.from('articoli').select('*').order('created_at', { ascending: false })
    if (error) setError('Errore caricamento: ' + error.message)
    else setArticoli(data || [])
    setLoading(false)
  }

  function calcolaPrezzi(costo: number, ricarica: number) {
    const base = costo * (1 + ricarica / 100)
    return {
      prezzo_base: Math.round(base * 100) / 100,
      prezzo_premium: Math.round(base * 1.15 * 100) / 100,
      prezzo_rivenditori: Math.round(base * 0.85 * 100) / 100,
    }
  }

  function handleCostoRicarica(field: 'costo' | 'ricarica', value: number) {
    const costo = field === 'costo' ? value : form.costo
    const ricarica = field === 'ricarica' ? value : form.ricarica
    const prezzi = calcolaPrezzi(costo, ricarica)
    setForm({ ...form, [field]: value, ...prezzi })
  }

  async function salvaArticolo() {
    if (!form.nome.trim()) { setError('Il nome è obbligatorio'); return }
    if (!form.codice.trim()) { setError('Il codice è obbligatorio'); return }
    setSaving(true); setError(''); setSuccess('')
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, user_id: user?.id || 'f1e0512f-0ecd-41b5-a29a-33fc9f832528' }
    let result
    if (editId) {
      result = await supabaseAdmin.from('articoli').update(payload).eq('id', editId)
    } else {
      result = await supabaseAdmin.from('articoli').insert([payload])
    }
    if (result.error) { setError('Errore salvataggio: ' + result.error.message) }
    else { setSuccess(editId ? 'Articolo aggiornato!' : 'Articolo salvato!'); setShowForm(false); setForm(emptyForm); setEditId(null); loadArticoli() }
    setSaving(false)
  }

  async function eliminaArticolo(id: string) {
    if (!confirm('Eliminare questo articolo?')) return
    const { error } = await supabaseAdmin.from('articoli').delete().eq('id', id)
    if (error) setError('Errore eliminazione: ' + error.message)
    else { setSuccess('Articolo eliminato'); loadArticoli() }
  }

  function apriModifica(a: any) {
    setForm({ ...a }); setEditId(a.id); setTabForm('dati'); setShowForm(true)
  }

  const articoliFiltrati = articoli.filter(a => {
    const matchStato = filtroStato === 'tutti' || a.stato === filtroStato
    const matchCerca = !cerca || a.nome?.toLowerCase().includes(cerca.toLowerCase()) || a.codice?.toLowerCase().includes(cerca.toLowerCase()) || a.ean?.includes(cerca)
    return matchStato && matchCerca
  })

  const kpi = {
    totale: articoli.length,
    attivi: articoli.filter(a => a.stato === 'attivo').length,
    sottoScorta: articoli.filter(a => a.stock <= a.stock_minimo && a.stock_minimo > 0).length,
    valoreStock: articoli.reduce((s, a) => s + (a.stock * a.prezzo_base), 0),
  }

  const tabs = [
    { id: 'dati', label: '📦 Dati' },
    { id: 'prezzi', label: '💰 Prezzi' },
    { id: 'magazzino', label: '🏭 Magazzino' },
  ]

  const inp = (style?: any) => ({ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, ...style })
  const lbl = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px', color: '#374151' }
  const sel = { ...inp(), background: 'white' }

  const badgeStato = (stato: string) => {
    const colors: any = { attivo: '#22c55e', bozza: '#f59e0b', fuori_produzione: '#ef4444' }
    return { background: (colors[stato] || '#94a3b8') + '20', color: colors[stato] || '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: '1px solid ' + (colors[stato] || '#64748b') }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Articoli</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>Catalogo prodotti e servizi</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setTabForm('dati'); setShowForm(true) }}
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
          + Nuovo Articolo
        </button>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }} onClick={() => setError('')}>{error} ✕</div>}
      {success && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }} onClick={() => setSuccess('')}>{success} ✕</div>}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Totale Articoli', value: kpi.totale, color: '#3b82f6' },
          { label: 'Attivi', value: kpi.attivi, color: '#22c55e' },
          { label: 'Sotto Scorta', value: kpi.sottoScorta, color: '#ef4444' },
          { label: 'Valore Stock', value: '€' + kpi.valoreStock.toFixed(0), color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Cerca per nome, codice, EAN..." value={cerca} onChange={e => setCerca(e.target.value)}
          style={{ flex: 1, minWidth: '200px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none' }} />
        {['tutti', 'attivo', 'bozza', 'fuori_produzione'].map(s => (
          <button key={s} onClick={() => setFiltroStato(s)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: filtroStato === s ? '#3b82f6' : '#f1f5f9', color: filtroStato === s ? 'white' : '#374151' }}>
            {s === 'fuori_produzione' ? 'Fuori prod.' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista articoli */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
          <p>Caricamento articoli...</p>
        </div>
      ) : articoliFiltrati.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
          <p style={{ fontWeight: '600' }}>Nessun articolo trovato</p>
          <p style={{ fontSize: '14px' }}>Clicca "+ Nuovo Articolo" per aggiungere il primo</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {articoliFiltrati.map(a => (
            <div key={a.id} style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{a.nome}</span>
                  <span style={{ background: '#f1f5f9', color: '#374151', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>{a.codice}</span>
                  {a.ean && <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>EAN: {a.ean}</span>}
                  <span style={badgeStato(a.stato)}>{a.stato}</span>
                  {a.stock <= a.stock_minimo && a.stock_minimo > 0 && <span style={{ background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>⚠️ SOTTO SCORTA</span>}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b' }}>
                  {a.categoria && <span>📁 {a.categoria}</span>}
                  <span>Stock: <b style={{ color: a.stock <= a.stock_minimo && a.stock_minimo > 0 ? '#ef4444' : '#22c55e' }}>{a.stock} {a.um}</b></span>
                  <span>Costo: <b style={{ color: '#374151' }}>€{a.costo}</b></span>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  <span>Base: <b style={{ color: '#3b82f6' }}>€{a.prezzo_base}</b></span>
                  <span>Premium: <b style={{ color: '#8b5cf6' }}>€{a.prezzo_premium}</b></span>
                  <span>Rivenditori: <b style={{ color: '#22c55e' }}>€{a.prezzo_rivenditori}</b></span>
                  <span>IVA: {a.iva}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => apriModifica(a)}
                  style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✏️ Modifica</button>
                <button onClick={() => eliminaArticolo(a.id)}
                  style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>{editId ? 'Modifica Articolo' : 'Nuovo Articolo'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTabForm(t.id)}
                  style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: tabForm === t.id ? 'white' : 'transparent', color: tabForm === t.id ? '#3b82f6' : '#64748b', boxShadow: tabForm === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tabForm === 'dati' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={lbl}>Nome Articolo *</label>
                  <input style={inp()} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Es. Scarpa Running Pro" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Codice Articolo *</label>
                    <input style={inp()} value={form.codice} onChange={e => setForm({ ...form, codice: e.target.value })} placeholder="ART-001" />
                  </div>
                  <div>
                    <label style={lbl}>Codice EAN / Barcode</label>
                    <input style={inp()} value={form.ean} onChange={e => setForm({ ...form, ean: e.target.value })} placeholder="8001234567890" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Categoria</label>
                    <input style={inp()} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Es. Abbigliamento" />
                  </div>
                  <div>
                    <label style={lbl}>Sottocategoria</label>
                    <input style={inp()} value={form.sottocategoria} onChange={e => setForm({ ...form, sottocategoria: e.target.value })} placeholder="Es. Scarpe" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Codice Fornitore</label>
                    <input style={inp()} value={form.codice_fornitore} onChange={e => setForm({ ...form, codice_fornitore: e.target.value })} placeholder="Codice del fornitore" />
                  </div>
                  <div>
                    <label style={lbl}>Unità di Misura</label>
                    <select style={sel} value={form.um} onChange={e => setForm({ ...form, um: e.target.value })}>
                      <option value="pz">Pz</option>
                      <option value="kg">Kg</option>
                      <option value="lt">Lt</option>
                      <option value="mt">Mt</option>
                      <option value="conf">Conf</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Stato</label>
                    <select style={sel} value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value })}>
                      <option value="attivo">Attivo</option>
                      <option value="bozza">Bozza</option>
                      <option value="fuori_produzione">Fuori produzione</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>IVA %</label>
                    <select style={sel} value={form.iva} onChange={e => setForm({ ...form, iva: Number(e.target.value) })}>
                      <option value={4}>4%</option>
                      <option value={10}>10%</option>
                      <option value={22}>22%</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Descrizione</label>
                  <textarea style={{ ...inp(), minHeight: '80px', resize: 'vertical' } as any} value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} placeholder="Descrizione dettagliata..." />
                </div>
              </div>
            )}

            {tabForm === 'prezzi' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Costo Acquisto €</label>
                    <input style={inp()} type="number" min="0" step="0.01" value={form.costo} onChange={e => handleCostoRicarica('costo', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={lbl}>Ricarica %</label>
                    <input style={inp()} type="number" min="0" step="0.1" value={form.ricarica} onChange={e => handleCostoRicarica('ricarica', Number(e.target.value))} />
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: '700', marginBottom: '8px' }}>💡 PREZZI CALCOLATI AUTOMATICAMENTE</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>BASE</div>
                      <div style={{ fontWeight: '800', color: '#3b82f6', fontSize: '18px' }}>€{form.prezzo_base.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>PREMIUM (+15%)</div>
                      <div style={{ fontWeight: '800', color: '#8b5cf6', fontSize: '18px' }}>€{form.prezzo_premium.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#64748b', fontSize: '11px' }}>RIVENDITORI (-15%)</div>
                      <div style={{ fontWeight: '800', color: '#22c55e', fontSize: '18px' }}>€{form.prezzo_rivenditori.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Prezzo Base (modifica manuale)</label>
                  <input style={inp()} type="number" min="0" step="0.01" value={form.prezzo_base} onChange={e => setForm({ ...form, prezzo_base: Number(e.target.value) })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Prezzo Premium</label>
                    <input style={inp()} type="number" min="0" step="0.01" value={form.prezzo_premium} onChange={e => setForm({ ...form, prezzo_premium: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={lbl}>Prezzo Rivenditori</label>
                    <input style={inp()} type="number" min="0" step="0.01" value={form.prezzo_rivenditori} onChange={e => setForm({ ...form, prezzo_rivenditori: Number(e.target.value) })} />
                  </div>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '700', marginBottom: '8px' }}>💰 PREZZI IVA INCLUSA ({form.iva}%)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    {[['Base', form.prezzo_base], ['Premium', form.prezzo_premium], ['Rivenditori', form.prezzo_rivenditori]].map(([l, p]) => (
                      <div key={l as string} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: '11px' }}>{l as string}</div>
                        <div style={{ fontWeight: '700', color: '#1e40af' }}>€{((p as number) * (1 + form.iva / 100)).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tabForm === 'magazzino' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Stock Attuale</label>
                    <input style={inp()} type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={lbl}>Stock Minimo</label>
                    <input style={inp()} type="number" min="0" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={lbl}>Stock Massimo</label>
                    <input style={inp()} type="number" min="0" value={form.stock_massimo} onChange={e => setForm({ ...form, stock_massimo: Number(e.target.value) })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Ubicazione</label>
                    <input style={inp()} value={form.ubicazione} onChange={e => setForm({ ...form, ubicazione: e.target.value })} placeholder="Es. Scaffale A3" />
                  </div>
                  <div>
                    <label style={lbl}>Fornitore</label>
                    <input style={inp()} value={form.fornitore} onChange={e => setForm({ ...form, fornitore: e.target.value })} placeholder="Nome fornitore" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Tempo Riordino (gg)</label>
                    <input style={inp()} type="number" min="0" value={form.tempo_riordino} onChange={e => setForm({ ...form, tempo_riordino: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={lbl}>Peso (kg)</label>
                    <input style={inp()} type="number" min="0" step="0.001" value={form.peso} onChange={e => setForm({ ...form, peso: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={lbl}>Dimensioni</label>
                    <input style={inp()} value={form.dimensioni} onChange={e => setForm({ ...form, dimensioni: e.target.value })} placeholder="Es. 30x20x10 cm" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Note</label>
                  <textarea style={{ ...inp(), minHeight: '80px', resize: 'vertical' } as any} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Note interne..." />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {tabForm !== 'dati' && (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) - 1].id)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>← Indietro</button>
              )}
              {tabForm !== 'magazzino' ? (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) + 1].id)}
                  style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>Avanti →</button>
              ) : (
                <button onClick={salvaArticolo} disabled={saving}
                  style={{ flex: 1, background: saving ? '#94a3b8' : '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  {saving ? '⏳ Salvataggio...' : '💾 Salva Articolo'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
