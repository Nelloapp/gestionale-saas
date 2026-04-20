'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'


type Cliente = {
  id?: string; nome: string; tipo: string; piva: string; cf: string;
  sdi: string; pec: string; email: string; tel: string; cellulare: string;
  sito: string; indirizzo: string; cap: string; citta: string; provincia: string;
  paese: string; listino: string; sconto: number; fido: number; pagamento: string;
  metodo_pagamento: string; agente: string; categoria: string; stato: string;
  data_primo_acquisto: string; note: string;
}

const emptyForm: Cliente = {
  nome: '', tipo: 'azienda', piva: '', cf: '', sdi: '', pec: '',
  email: '', tel: '', cellulare: '', sito: '',
  indirizzo: '', cap: '', citta: '', provincia: '', paese: 'Italia',
  listino: 'base', sconto: 0, fido: 0, pagamento: '30gg',
  metodo_pagamento: 'bonifico', agente: '', categoria: 'standard',
  stato: 'attivo', data_primo_acquisto: '', note: ''
}

export default function ClientiPage() {
  const [clienti, setClienti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showScheda, setShowScheda] = useState<any>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Cliente>(emptyForm)
  const [tabForm, setTabForm] = useState('anagrafica')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [cerca, setCerca] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { loadClienti() }, [])

  async function loadClienti() {
    setLoading(true)
    const { data, error } = await supabaseAdmin.from('clienti').select('*').order('created_at', { ascending: false })
    if (error) setError('Errore caricamento: ' + error.message)
    else setClienti(data || [])
    setLoading(false)
  }

  async function salvaCliente() {
    if (!form.nome.trim()) { setError('Il nome è obbligatorio'); return }
    setSaving(true); setError(''); setSuccess('')
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, user_id: user?.id || 'f1e0512f-0ecd-41b5-a29a-33fc9f832528', sconto: Number(form.sconto), fido: Number(form.fido) }
    let result
    if (editId) {
      result = await supabaseAdmin.from('clienti').update(payload).eq('id', editId)
    } else {
      result = await supabaseAdmin.from('clienti').insert([payload])
    }
    if (result.error) { setError('Errore salvataggio: ' + result.error.message) }
    else { setSuccess(editId ? 'Cliente aggiornato!' : 'Cliente salvato!'); setShowForm(false); setForm(emptyForm); setEditId(null); loadClienti() }
    setSaving(false)
  }

  async function eliminaCliente(id: string) {
    if (!confirm('Eliminare questo cliente?')) return
    const { error } = await supabaseAdmin.from('clienti').delete().eq('id', id)
    if (error) setError('Errore eliminazione: ' + error.message)
    else { setSuccess('Cliente eliminato'); loadClienti() }
  }

  function apriModifica(c: any) {
    setForm({ ...c }); setEditId(c.id); setTabForm('anagrafica'); setShowForm(true)
  }

  const clientiFiltrati = clienti.filter(c => {
    const matchStato = filtroStato === 'tutti' || c.stato === filtroStato
    const matchCerca = !cerca || c.nome?.toLowerCase().includes(cerca.toLowerCase()) || c.email?.toLowerCase().includes(cerca.toLowerCase()) || c.piva?.includes(cerca)
    return matchStato && matchCerca
  })

  const kpi = {
    totale: clienti.length,
    attivi: clienti.filter(c => c.stato === 'attivo').length,
    prospect: clienti.filter(c => c.stato === 'prospect').length,
    vip: clienti.filter(c => c.categoria === 'vip').length,
  }

  const tabs = [
    { id: 'anagrafica', label: '👤 Anagrafica' },
    { id: 'contatti', label: '📞 Contatti' },
    { id: 'commerciale', label: '💼 Commerciale' },
    { id: 'amministrativo', label: '⚙️ Amministrativo' },
  ]

  const inp = (style?: any) => ({ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const, ...style })
  const lbl = { display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px', color: '#374151' }
  const sel = { ...inp(), background: 'white' }

  const badgeCategoria = (cat: string) => {
    const colors: any = { vip: '#f59e0b', standard: '#3b82f6', occasionale: '#22c55e' }
    return { background: colors[cat] || '#94a3b8', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }
  }

  const badgeStato = (stato: string) => {
    const colors: any = { attivo: '#22c55e', prospect: '#3b82f6', sospeso: '#f59e0b', bloccato: '#ef4444' }
    return { background: colors[stato] + '20', color: colors[stato] || '#64748b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: '1px solid ' + (colors[stato] || '#64748b') }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Clienti</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>Gestione anagrafica clienti</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setTabForm('anagrafica'); setShowForm(true) }}
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 20px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
          + Nuovo Cliente
        </button>
      </div>

      {/* Messaggi */}
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }} onClick={() => setError('')}>{error} ✕</div>}
      {success && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }} onClick={() => setSuccess('')}>{success} ✕</div>}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Totale Clienti', value: kpi.totale, color: '#3b82f6' },
          { label: 'Attivi', value: kpi.attivi, color: '#22c55e' },
          { label: 'Prospect', value: kpi.prospect, color: '#f59e0b' },
          { label: 'VIP', value: kpi.vip, color: '#8b5cf6' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${k.color}` }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Cerca per nome, email, P.IVA..." value={cerca} onChange={e => setCerca(e.target.value)}
          style={{ flex: 1, minWidth: '200px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', outline: 'none' }} />
        {['tutti', 'attivo', 'prospect', 'sospeso', 'bloccato'].map(s => (
          <button key={s} onClick={() => setFiltroStato(s)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px', background: filtroStato === s ? '#3b82f6' : '#f1f5f9', color: filtroStato === s ? 'white' : '#374151' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista clienti */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div>
          <p>Caricamento clienti...</p>
        </div>
      ) : clientiFiltrati.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
          <p style={{ fontWeight: '600' }}>Nessun cliente trovato</p>
          <p style={{ fontSize: '14px' }}>Clicca "+ Nuovo Cliente" per aggiungere il primo</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {clientiFiltrati.map(c => (
            <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>{c.nome}</span>
                  <span style={badgeCategoria(c.categoria)}>{c.categoria?.toUpperCase()}</span>
                  <span style={badgeStato(c.stato)}>{c.stato}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b' }}>
                  {c.email && <span>✉️ {c.email}</span>}
                  {c.tel && <span>📞 {c.tel}</span>}
                  {c.piva && <span>🏢 P.IVA: {c.piva}</span>}
                  {c.sdi && <span>📄 SDI: {c.sdi}</span>}
                  {c.citta && <span>📍 {c.citta}</span>}
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  <span>Listino: <b style={{ color: '#374151' }}>{c.listino}</b></span>
                  {c.sconto > 0 && <span>Sconto: <b style={{ color: '#22c55e' }}>{c.sconto}%</b></span>}
                  {c.fido > 0 && <span>Fido: <b style={{ color: '#3b82f6' }}>€{c.fido}</b></span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowScheda(c)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>👁️ Scheda</button>
                <button onClick={() => apriModifica(c)}
                  style={{ background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>✏️ Modifica</button>
                <button onClick={() => eliminaCliente(c.id)}
                  style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Scheda Cliente */}
      {showScheda && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>{showScheda.nome}</h2>
              <button onClick={() => setShowScheda(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                ['Tipo', showScheda.tipo], ['Stato', showScheda.stato], ['P.IVA', showScheda.piva], ['C.F.', showScheda.cf],
                ['SDI', showScheda.sdi], ['PEC', showScheda.pec], ['Email', showScheda.email], ['Telefono', showScheda.tel],
                ['Cellulare', showScheda.cellulare], ['Sito', showScheda.sito], ['Indirizzo', showScheda.indirizzo],
                ['CAP', showScheda.cap], ['Città', showScheda.citta], ['Provincia', showScheda.provincia],
                ['Listino', showScheda.listino], ['Sconto', showScheda.sconto ? showScheda.sconto + '%' : '-'],
                ['Fido', showScheda.fido ? '€' + showScheda.fido : '-'], ['Pagamento', showScheda.pagamento],
                ['Metodo', showScheda.metodo_pagamento], ['Categoria', showScheda.categoria],
                ['Agente', showScheda.agente], ['Primo acquisto', showScheda.data_primo_acquisto],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>{k as string}</div>
                  <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: '600' }}>{v as string}</div>
                </div>
              ))}
            </div>
            {showScheda.note && (
              <div style={{ marginTop: '16px', background: '#fffbeb', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>NOTE</div>
                <div style={{ fontSize: '14px', color: '#78350f' }}>{showScheda.note}</div>
              </div>
            )}
            <button onClick={() => { apriModifica(showScheda); setShowScheda(null) }}
              style={{ width: '100%', marginTop: '20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
              ✏️ Modifica Cliente
            </button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>{editId ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {/* Tab navigazione */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTabForm(t.id)}
                  style={{ flex: 1, padding: '8px 4px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: tabForm === t.id ? 'white' : 'transparent', color: tabForm === t.id ? '#3b82f6' : '#64748b', boxShadow: tabForm === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Anagrafica */}
            {tabForm === 'anagrafica' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={lbl}>Ragione Sociale / Nome *</label>
                  <input style={inp()} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Es. Rossi Group SRL" />
                </div>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={sel} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="azienda">Azienda</option>
                    <option value="privato">Privato</option>
                    <option value="libero_professionista">Libero Professionista</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Partita IVA</label>
                    <input style={inp()} value={form.piva} onChange={e => setForm({ ...form, piva: e.target.value })} placeholder="IT12345678901" />
                  </div>
                  <div>
                    <label style={lbl}>Codice Fiscale</label>
                    <input style={inp()} value={form.cf} onChange={e => setForm({ ...form, cf: e.target.value })} placeholder="RSSMRA80A01H501Z" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Codice SDI</label>
                    <input style={inp()} value={form.sdi} onChange={e => setForm({ ...form, sdi: e.target.value })} placeholder="ABCDE12" />
                  </div>
                  <div>
                    <label style={lbl}>PEC</label>
                    <input style={inp()} value={form.pec} onChange={e => setForm({ ...form, pec: e.target.value })} placeholder="azienda@pec.it" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Indirizzo</label>
                  <input style={inp()} value={form.indirizzo} onChange={e => setForm({ ...form, indirizzo: e.target.value })} placeholder="Via Roma 1" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>CAP</label>
                    <input style={inp()} value={form.cap} onChange={e => setForm({ ...form, cap: e.target.value })} placeholder="20100" />
                  </div>
                  <div>
                    <label style={lbl}>Città</label>
                    <input style={inp()} value={form.citta} onChange={e => setForm({ ...form, citta: e.target.value })} placeholder="Milano" />
                  </div>
                  <div>
                    <label style={lbl}>Prov.</label>
                    <input style={inp()} value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} placeholder="MI" />
                  </div>
                </div>
              </div>
            )}

            {/* Tab Contatti */}
            {tabForm === 'contatti' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp()} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@azienda.it" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Telefono</label>
                    <input style={inp()} value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} placeholder="+39 02 1234567" />
                  </div>
                  <div>
                    <label style={lbl}>Cellulare</label>
                    <input style={inp()} value={form.cellulare} onChange={e => setForm({ ...form, cellulare: e.target.value })} placeholder="+39 333 1234567" />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Sito Web</label>
                  <input style={inp()} value={form.sito} onChange={e => setForm({ ...form, sito: e.target.value })} placeholder="www.azienda.it" />
                </div>
              </div>
            )}

            {/* Tab Commerciale */}
            {tabForm === 'commerciale' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Listino Prezzi</label>
                    <select style={sel} value={form.listino} onChange={e => setForm({ ...form, listino: e.target.value })}>
                      <option value="base">Base</option>
                      <option value="premium">Premium</option>
                      <option value="rivenditori">Rivenditori</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Categoria</label>
                    <select style={sel} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                      <option value="standard">Standard</option>
                      <option value="vip">VIP</option>
                      <option value="occasionale">Occasionale</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Sconto Fisso %</label>
                    <input style={inp()} type="number" min="0" max="100" value={form.sconto} onChange={e => setForm({ ...form, sconto: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={lbl}>Fido Massimo €</label>
                    <input style={inp()} type="number" min="0" value={form.fido} onChange={e => setForm({ ...form, fido: Number(e.target.value) })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Condizioni Pagamento</label>
                    <select style={sel} value={form.pagamento} onChange={e => setForm({ ...form, pagamento: e.target.value })}>
                      <option value="immediato">Immediato</option>
                      <option value="30gg">30 giorni</option>
                      <option value="60gg">60 giorni</option>
                      <option value="90gg">90 giorni</option>
                      <option value="anticipato">Pagamento anticipato</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Metodo Pagamento</label>
                    <select style={sel} value={form.metodo_pagamento} onChange={e => setForm({ ...form, metodo_pagamento: e.target.value })}>
                      <option value="bonifico">Bonifico</option>
                      <option value="contanti">Contanti</option>
                      <option value="carta">Carta</option>
                      <option value="rid">RID/SDD</option>
                      <option value="assegno">Assegno</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Agente / Commerciale</label>
                  <input style={inp()} value={form.agente} onChange={e => setForm({ ...form, agente: e.target.value })} placeholder="Nome agente assegnato" />
                </div>
              </div>
            )}

            {/* Tab Amministrativo */}
            {tabForm === 'amministrativo' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <label style={lbl}>Stato Cliente</label>
                  <select style={sel} value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value })}>
                    <option value="attivo">Attivo</option>
                    <option value="prospect">Prospect</option>
                    <option value="sospeso">Sospeso</option>
                    <option value="bloccato">Bloccato</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Data Primo Acquisto</label>
                  <input style={inp()} type="date" value={form.data_primo_acquisto} onChange={e => setForm({ ...form, data_primo_acquisto: e.target.value })} />
                </div>
                <div>
                  <label style={lbl}>Note Interne</label>
                  <textarea style={{ ...inp(), minHeight: '100px', resize: 'vertical' } as any} placeholder="Note private per il team..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {tabForm !== 'anagrafica' && (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) - 1].id)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>← Indietro</button>
              )}
              {tabForm !== 'amministrativo' ? (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) + 1].id)}
                  style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>Avanti →</button>
              ) : (
                <button onClick={salvaCliente} disabled={saving}
                  style={{ flex: 1, background: saving ? '#94a3b8' : '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  {saving ? '⏳ Salvataggio...' : '💾 Salva Cliente'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
