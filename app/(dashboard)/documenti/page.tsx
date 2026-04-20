'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'
const inp = (extra?: any): any => ({ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', ...extra })
const btn = (bg: string, extra?: any): any => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14, ...extra })

const TIPI_DOC = [
  { id: 'preventivo', label: 'Preventivo', prefix: 'PV' },
  { id: 'ordine', label: 'Ordine', prefix: 'OR' },
  { id: 'ddt', label: 'DDT', prefix: 'DDT' },
  { id: 'fattura', label: 'Fattura', prefix: 'FT' },
  { id: 'incasso', label: 'Incasso', prefix: 'INC' },
]
const LISTINI = ['Base', 'Ingrosso', 'Promo', 'VIP']
const PAGAMENTI = ['Contanti', 'Carta', 'Bonifico', 'Assegno', 'RiBa', 'SDD']
const emptyRiga = { articolo_id: '', codice: '', ean: '', descrizione: '', colore_nome: '', misura_nome: '', um: 'Pz', qta: 1, prezzo: 0, sconto1: 0, sconto2: 0, iva: 22, imponibile: 0, importo: 0 }
const emptyForm = { tipo: 'preventivo', cliente_id: '', cliente_nome: '', cliente_cf: '', data_registrazione: new Date().toISOString().split('T')[0], data_documento: new Date().toISOString().split('T')[0], data_consegna: '', data_scadenza: '', pagamento: 'Contanti', listino: 'Base', agente: '', note: '', stato: 'bozza' }

function calcolaRiga(r: any) {
  const prezzoScontato = r.prezzo * (1 - r.sconto1 / 100) * (1 - r.sconto2 / 100)
  const imponibile = prezzoScontato * r.qta
  const importo = imponibile * (1 + r.iva / 100)
  return { ...r, imponibile: Math.round(imponibile * 100) / 100, importo: Math.round(importo * 100) / 100 }
}

export default function DocumentiPage() {
  const [documenti, setDocumenti] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [articoli, setArticoli] = useState<any[]>([])
  const [varianti, setVarianti] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'lista' | 'form'>('lista')
  const [form, setForm] = useState({ ...emptyForm })
  const [righe, setRighe] = useState<any[]>([{ ...emptyRiga }])
  const [docId, setDocId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [cerca, setCerca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('tutti')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [cercaArticolo, setCercaArticolo] = useState('')
  const [suggerimentiArt, setSuggerimentiArt] = useState<any[]>([])
  const [rigaAttiva, setRigaAttiva] = useState<number | null>(null)
  const [tabForm, setTabForm] = useState<'testata' | 'righe' | 'scadenze'>('testata')
  const barcodeRef = useRef<HTMLInputElement>(null)
  const barcodeTimer = useRef<any>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: docs }, { data: cls }, { data: arts }, { data: vars }] = await Promise.all([
      supabaseAdmin.from('documenti').select('*').order('data_documento', { ascending: false }),
      supabaseAdmin.from('clienti').select('id, nome, piva, cf, listino').order('nome'),
      supabaseAdmin.from('articoli').select('id, nome, codice, ean, prezzo, prezzo_ingrosso, prezzo_promo, prezzo_vip, iva, um, stock').order('nome'),
      supabaseAdmin.from('varianti_articolo').select('id, articolo_id, colore_nome, misura_nome, ean, codice_variante, prezzo_override, stock'),
    ])
    setDocumenti(docs || [])
    setClienti(cls || [])
    setArticoli(arts || [])
    setVarianti(vars || [])
    setLoading(false)
  }

  function getPrezzoListino(art: any, listino: string) {
    if (listino === 'Ingrosso' && art.prezzo_ingrosso > 0) return art.prezzo_ingrosso
    if (listino === 'Promo' && art.prezzo_promo > 0) return art.prezzo_promo
    if (listino === 'VIP' && art.prezzo_vip > 0) return art.prezzo_vip
    return art.prezzo || 0
  }

  function cercaPerEanOCodice(query: string): any | null {
    const q = query.trim().toLowerCase()
    // Prima cerca nelle varianti per EAN
    const varMatch = varianti.find(v => v.ean?.toLowerCase() === q || v.codice_variante?.toLowerCase() === q)
    if (varMatch) {
      const art = articoli.find(a => a.id === varMatch.articolo_id)
      if (art) return { art, variante: varMatch }
    }
    // Poi cerca negli articoli per EAN o codice
    const artMatch = articoli.find(a => a.ean?.toLowerCase() === q || a.codice?.toLowerCase() === q || a.nome?.toLowerCase().includes(q))
    if (artMatch) return { art: artMatch, variante: null }
    return null
  }

  function aggiungiRigaDaArticolo(art: any, variante: any, idx: number) {
    const prezzo = variante?.prezzo_override || getPrezzoListino(art, form.listino)
    const nuovaRiga = calcolaRiga({
      ...emptyRiga,
      articolo_id: art.id,
      codice: variante?.codice_variante || art.codice || '',
      ean: variante?.ean || art.ean || '',
      descrizione: art.nome + (variante ? ` - ${variante.colore_nome || ''} ${variante.misura_nome || ''}`.trim() : ''),
      colore_nome: variante?.colore_nome || '',
      misura_nome: variante?.misura_nome || '',
      um: art.um || 'Pz',
      qta: 1,
      prezzo,
      iva: art.iva || 22,
    })
    const newRighe = [...righe]
    newRighe[idx] = nuovaRiga
    // Aggiungi riga vuota se era l'ultima
    if (idx === righe.length - 1) newRighe.push({ ...emptyRiga })
    setRighe(newRighe)
    setSuggerimentiArt([])
    setCercaArticolo('')
    setRigaAttiva(null)
  }

  function handleBarcodeInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const val = (e.target as HTMLInputElement).value.trim()
      if (!val) return
      const found = cercaPerEanOCodice(val)
      if (found) {
        // Trova prima riga vuota o aggiunge in fondo
        const idxVuota = righe.findIndex(r => !r.descrizione)
        const idx = idxVuota >= 0 ? idxVuota : righe.length
        if (idx === righe.length) setRighe(r => [...r, { ...emptyRiga }])
        setTimeout(() => aggiungiRigaDaArticolo(found.art, found.variante, idx), 0)
      } else {
        setError('Articolo non trovato per: ' + val)
      }
      ;(e.target as HTMLInputElement).value = ''
    }
  }

  function handleCercaArticolo(query: string, idx: number) {
    setCercaArticolo(query)
    setRigaAttiva(idx)
    if (query.length < 2) { setSuggerimentiArt([]); return }
    const q = query.toLowerCase()
    const matches: any[] = []
    articoli.forEach(art => {
      if (art.nome?.toLowerCase().includes(q) || art.codice?.toLowerCase().includes(q) || art.ean?.includes(q)) {
        matches.push({ art, variante: null, label: art.nome + (art.codice ? ` [${art.codice}]` : '') })
      }
      varianti.filter(v => v.articolo_id === art.id).forEach(v => {
        if (v.ean?.includes(q) || v.codice_variante?.toLowerCase().includes(q) || art.nome?.toLowerCase().includes(q)) {
          matches.push({ art, variante: v, label: `${art.nome} - ${v.colore_nome || ''} ${v.misura_nome || ''}`.trim() + (v.ean ? ` [${v.ean}]` : '') })
        }
      })
    })
    setSuggerimentiArt(matches.slice(0, 10))
  }

  function aggiornaRiga(idx: number, field: string, value: any) {
    const newRighe = [...righe]
    newRighe[idx] = calcolaRiga({ ...newRighe[idx], [field]: value })
    setRighe(newRighe)
  }

  function rimuoviRiga(idx: number) {
    if (righe.length === 1) { setRighe([{ ...emptyRiga }]); return }
    setRighe(righe.filter((_, i) => i !== idx))
  }

  const totImponibile = righe.reduce((s, r) => s + (r.imponibile || 0), 0)
  const totIva = righe.reduce((s, r) => s + ((r.importo || 0) - (r.imponibile || 0)), 0)
  const totDocumento = righe.reduce((s, r) => s + (r.importo || 0), 0)

  async function generaNumeroDoc(tipo: string) {
    const anno = new Date().getFullYear()
    const prefix = TIPI_DOC.find(t => t.id === tipo)?.prefix || 'DOC'
    const { data } = await supabaseAdmin.from('documenti').select('numero_doc').eq('tipo', tipo).like('numero_doc', `${anno}_${prefix}%`).order('numero_doc', { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const last = data[0].numero_doc
      const num = parseInt(last.split('/').pop() || '0') + 1
      return `${anno}_${prefix}${String(num).padStart(5, '0')}`
    }
    return `${anno}_${prefix}00001`
  }

  async function salvaDocumento() {
    if (!form.tipo) { setError('Tipo documento obbligatorio'); return }
    setSaving(true); setError(''); setSuccess('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    let numDoc = docId ? (documenti.find(d => d.id === docId)?.numero_doc || '') : await generaNumeroDoc(form.tipo)
    const payload = {
      ...form, user_id: uid, numero_doc: numDoc, anno: new Date().getFullYear(),
      totale_imponibile: totImponibile, totale_iva: totIva, totale_documento: totDocumento,
      updated_at: new Date().toISOString(),
      data_registrazione: form.data_registrazione || null,
      data_documento: form.data_documento || null,
      data_consegna: form.data_consegna || null,
      data_scadenza: form.data_scadenza || null,
    }
    let docSalvato: any
    if (docId) {
      const { data, error: e } = await supabaseAdmin.from('documenti').update(payload).eq('id', docId).select().single()
      if (e) { setError('Errore: ' + e.message); setSaving(false); return }
      docSalvato = data
    } else {
      const { data, error: e } = await supabaseAdmin.from('documenti').insert([payload]).select().single()
      if (e) { setError('Errore: ' + e.message); setSaving(false); return }
      docSalvato = data
    }
    // Salva righe
    if (docId) await supabaseAdmin.from('documenti_righe').delete().eq('documento_id', docId)
    const righePayload = righe.filter(r => r.descrizione?.trim()).map((r, i) => ({
      ...r, documento_id: docSalvato.id, user_id: uid, riga_num: i + 1
    }))
    if (righePayload.length > 0) await supabaseAdmin.from('documenti_righe').insert(righePayload)
    // Mastino e scadenzario
    if (form.cliente_id && ['preventivo', 'fattura', 'ordine', 'ddt'].includes(form.tipo) && !docId) {
      const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', form.cliente_id).order('created_at', { ascending: false }).limit(1)
      const saldoPrecedente = lastMov?.[0]?.saldo_progressivo || 0
      await supabaseAdmin.from('mastino_clienti').insert([{
        user_id: uid, cliente_id: form.cliente_id, cliente_nome: form.cliente_nome,
        documento_id: docSalvato.id, numero_doc: numDoc,
        data_movimento: form.data_documento,
        causale: `${TIPI_DOC.find(t => t.id === form.tipo)?.label} - ${numDoc}`,
        tipo_movimento: 'dare', importo_dare: totDocumento, importo_avere: 0,
        saldo_progressivo: saldoPrecedente + totDocumento,
        data_scadenza: form.data_scadenza || null, pagato: false
      }])
      if (form.data_scadenza) {
        await supabaseAdmin.from('scadenzario').insert([{
          user_id: uid, cliente_id: form.cliente_id, cliente_nome: form.cliente_nome,
          documento_id: docSalvato.id, numero_doc: numDoc,
          data_scadenza: form.data_scadenza, importo: totDocumento, importo_residuo: totDocumento, pagato: false
        }])
      }
    }
    setSuccess('Documento ' + numDoc + ' salvato!')
    loadAll()
    setTimeout(() => { setSuccess(''); setView('lista') }, 1500)
    setSaving(false)
  }

  async function apriDocumento(doc: any) {
    setDocId(doc.id)
    setForm({ tipo: doc.tipo, cliente_id: doc.cliente_id || '', cliente_nome: doc.cliente_nome || '', cliente_cf: doc.cliente_cf || '', data_registrazione: doc.data_registrazione || '', data_documento: doc.data_documento || '', data_consegna: doc.data_consegna || '', data_scadenza: doc.data_scadenza || '', pagamento: doc.pagamento || 'Contanti', listino: doc.listino || 'Base', agente: doc.agente || '', note: doc.note || '', stato: doc.stato || 'bozza' })
    const { data: righeDoc } = await supabaseAdmin.from('documenti_righe').select('*').eq('documento_id', doc.id).order('riga_num')
    setRighe(righeDoc && righeDoc.length > 0 ? righeDoc.map(r => calcolaRiga(r)) : [{ ...emptyRiga }])
    setTabForm('testata')
    setView('form')
  }

  async function eliminaDocumento(id: string) {
    if (!confirm('Eliminare questo documento?')) return
    await supabaseAdmin.from('documenti_righe').delete().eq('documento_id', id)
    const { error } = await supabaseAdmin.from('documenti').delete().eq('id', id)
    if (error) setError('Errore: ' + error.message)
    else { setSuccess('Documento eliminato'); loadAll() }
  }

  const docFiltrati = documenti.filter(d => {
    if (filtroTipo !== 'tutti' && d.tipo !== filtroTipo) return false
    if (filtroStato !== 'tutti' && d.stato !== filtroStato) return false
    if (filtroDal && d.data_documento < filtroDal) return false
    if (filtroAl && d.data_documento > filtroAl) return false
    if (filtroCliente && !d.cliente_nome?.toLowerCase().includes(filtroCliente.toLowerCase())) return false
    if (cerca && !d.numero_doc?.toLowerCase().includes(cerca.toLowerCase()) && !d.cliente_nome?.toLowerCase().includes(cerca.toLowerCase())) return false
    return true
  })

  const totFiltrati = docFiltrati.reduce((s, d) => s + (d.totale_documento || 0), 0)

  const Err = () => error ? <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12 }}>{error} <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', float: 'right' }}>x</button></div> : null
  const Suc = () => success ? <div style={{ background: '#d1fae5', color: '#065f46', padding: 12, borderRadius: 8, marginBottom: 12 }}>{success}</div> : null

  if (view === 'form') return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { setView('lista'); setDocId(null); setForm({ ...emptyForm }); setRighe([{ ...emptyRiga }]) }} style={btn('#64748b')}>Indietro</button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{docId ? 'Modifica Documento' : 'Nuovo Documento'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '6px 16px', fontSize: 14, fontWeight: 700, color: '#166534' }}>
            Tot: euro{totDocumento.toFixed(2)}
          </div>
          <button onClick={salvaDocumento} disabled={saving} style={btn('#10b981', { padding: '8px 24px' })}>{saving ? 'Salvataggio...' : 'Salva Documento'}</button>
        </div>
      </div>
      <Err /><Suc />

      {/* Tab */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0' }}>
        {[['testata', 'Testata'], ['righe', 'Righe Articoli'], ['scadenze', 'Scadenze']].map(([t, label]) => (
          <button key={t} onClick={() => setTabForm(t as any)} style={{ background: 'none', border: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: tabForm === t ? 700 : 400, color: tabForm === t ? '#3b82f6' : '#64748b', borderBottom: tabForm === t ? '2px solid #3b82f6' : '2px solid transparent', marginBottom: -2 }}>{label}</button>
        ))}
      </div>

      {tabForm === 'testata' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Tipo Documento *</label>
              <select style={inp()} value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                {TIPI_DOC.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Listino</label>
              <select style={inp()} value={form.listino} onChange={e => setForm(p => ({ ...p, listino: e.target.value }))}>
                {LISTINI.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Pagamento</label>
              <select style={inp()} value={form.pagamento} onChange={e => setForm(p => ({ ...p, pagamento: e.target.value }))}>
                {PAGAMENTI.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Stato</label>
              <select style={inp()} value={form.stato} onChange={e => setForm(p => ({ ...p, stato: e.target.value }))}>
                {['bozza', 'confermato', 'spedito', 'fatturato', 'annullato'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Cliente</label>
              <select style={inp()} value={form.cliente_id} onChange={e => {
                const cl = clienti.find(c => c.id === e.target.value)
                setForm(p => ({ ...p, cliente_id: e.target.value, cliente_nome: cl?.nome || '', listino: cl?.listino || p.listino }))
              }}>
                <option value="">-- Seleziona cliente --</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}{c.piva ? ` (P.IVA: ${c.piva})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Data Registrazione</label>
              <input type="date" style={inp()} value={form.data_registrazione} onChange={e => setForm(p => ({ ...p, data_registrazione: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Data Documento</label>
              <input type="date" style={inp()} value={form.data_documento} onChange={e => setForm(p => ({ ...p, data_documento: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Data Consegna</label>
              <input type="date" style={inp()} value={form.data_consegna} onChange={e => setForm(p => ({ ...p, data_consegna: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Agente</label>
              <input style={inp()} value={form.agente} onChange={e => setForm(p => ({ ...p, agente: e.target.value }))} placeholder="Nome agente" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Note</label>
              <textarea style={{ ...inp(), height: 60, resize: 'vertical' }} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Note documento..." />
            </div>
          </div>
        </div>
      )}

      {tabForm === 'righe' && (
        <div>
          {/* Barcode scanner */}
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Scan EAN/Barcode:</span>
            <input ref={barcodeRef} onKeyDown={handleBarcodeInput} style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', fontSize: 14, color: '#f1f5f9', outline: 'none' }} placeholder="Scansiona o digita codice e premi INVIO..." autoFocus />
            <span style={{ color: '#64748b', fontSize: 12 }}>Listino: <b style={{ color: '#60a5fa' }}>{form.listino}</b></span>
          </div>

          {/* Tabella righe */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#fff' }}>
                  {['#', 'Codice/EAN', 'Descrizione Articolo', 'Colore', 'Misura', 'UM', 'Qta', 'Prezzo', 'Sc1%', 'Sc2%', 'IVA%', 'Imponibile', 'Importo', ''].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righe.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '6px 8px', fontSize: 12, color: '#94a3b8', width: 30 }}>{idx + 1}</td>
                    <td style={{ padding: '4px 6px', width: 120 }}>
                      <input style={{ ...inp({ fontSize: 12, padding: '5px 8px' }), fontFamily: 'monospace' }} value={r.codice || r.ean || ''} onChange={e => {
                        const found = cercaPerEanOCodice(e.target.value)
                        if (found) aggiungiRigaDaArticolo(found.art, found.variante, idx)
                        else aggiornaRiga(idx, 'codice', e.target.value)
                      }} placeholder="Codice/EAN" />
                    </td>
                    <td style={{ padding: '4px 6px', minWidth: 200, position: 'relative' }}>
                      <input style={inp({ fontSize: 12, padding: '5px 8px' })} value={rigaAttiva === idx ? cercaArticolo : r.descrizione} onChange={e => { handleCercaArticolo(e.target.value, idx) }} onFocus={() => { setRigaAttiva(idx); setCercaArticolo(r.descrizione) }} onBlur={() => setTimeout(() => { setRigaAttiva(null); setSuggerimentiArt([]) }, 200)} placeholder="Cerca articolo..." />
                      {rigaAttiva === idx && suggerimentiArt.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 1000, maxHeight: 240, overflowY: 'auto' }}>
                          {suggerimentiArt.map((s, i) => (
                            <div key={i} onMouseDown={() => aggiungiRigaDaArticolo(s.art, s.variante, idx)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13 }} onMouseEnter={e => (e.currentTarget.style.background = '#f0f9ff')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                              <div style={{ fontWeight: 600 }}>{s.label}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>euro{getPrezzoListino(s.art, form.listino).toFixed(2)} · IVA {s.art.iva}%</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '4px 6px', width: 80 }}><input style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.colore_nome || ''} onChange={e => aggiornaRiga(idx, 'colore_nome', e.target.value)} placeholder="Colore" /></td>
                    <td style={{ padding: '4px 6px', width: 70 }}><input style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.misura_nome || ''} onChange={e => aggiornaRiga(idx, 'misura_nome', e.target.value)} placeholder="Mis." /></td>
                    <td style={{ padding: '4px 6px', width: 50 }}><input style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.um || 'Pz'} onChange={e => aggiornaRiga(idx, 'um', e.target.value)} /></td>
                    <td style={{ padding: '4px 6px', width: 60 }}><input type="number" style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.qta} onChange={e => aggiornaRiga(idx, 'qta', Number(e.target.value))} min={0} /></td>
                    <td style={{ padding: '4px 6px', width: 80 }}><input type="number" step="0.01" style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.prezzo} onChange={e => aggiornaRiga(idx, 'prezzo', Number(e.target.value))} /></td>
                    <td style={{ padding: '4px 6px', width: 55 }}><input type="number" step="0.1" style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.sconto1} onChange={e => aggiornaRiga(idx, 'sconto1', Number(e.target.value))} /></td>
                    <td style={{ padding: '4px 6px', width: 55 }}><input type="number" step="0.1" style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.sconto2} onChange={e => aggiornaRiga(idx, 'sconto2', Number(e.target.value))} /></td>
                    <td style={{ padding: '4px 6px', width: 55 }}><input type="number" style={inp({ fontSize: 12, padding: '5px 8px' })} value={r.iva} onChange={e => aggiornaRiga(idx, 'iva', Number(e.target.value))} /></td>
                    <td style={{ padding: '6px 8px', fontSize: 13, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>euro{(r.imponibile || 0).toFixed(2)}</td>
                    <td style={{ padding: '6px 8px', fontSize: 13, fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap' }}>euro{(r.importo || 0).toFixed(2)}</td>
                    <td style={{ padding: '4px 6px' }}><button onClick={() => rimuoviRiga(idx)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 16 }}>x</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1e293b', color: '#fff' }}>
                  <td colSpan={11} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>TOTALI ({righe.filter(r => r.descrizione).length} righe)</td>
                  <td style={{ padding: '10px 8px', fontSize: 14, fontWeight: 700 }}>euro{totImponibile.toFixed(2)}</td>
                  <td style={{ padding: '10px 8px', fontSize: 14, fontWeight: 700 }}>euro{totDocumento.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={() => setRighe(r => [...r, { ...emptyRiga }])} style={btn('#64748b', { fontSize: 13 })}>+ Aggiungi Riga</button>
            <span style={{ alignSelf: 'center', fontSize: 13, color: '#64748b' }}>IVA: euro{totIva.toFixed(2)} · Imponibile: euro{totImponibile.toFixed(2)} · <b>Totale: euro{totDocumento.toFixed(2)}</b></span>
          </div>
        </div>
      )}

      {tabForm === 'scadenze' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Scadenza Pagamento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Data Scadenza</label>
              <input type="date" style={inp()} value={form.data_scadenza} onChange={e => setForm(p => ({ ...p, data_scadenza: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
              {[30, 60, 90].map(gg => (
                <button key={gg} onClick={() => {
                  const d = new Date(form.data_documento || new Date())
                  d.setDate(d.getDate() + gg)
                  setForm(p => ({ ...p, data_scadenza: d.toISOString().split('T')[0] }))
                }} style={{ ...btn('#64748b', { fontSize: 13 }), padding: '8px 14px' }}>+{gg}gg</button>
              ))}
              <button onClick={() => {
                const d = new Date(form.data_documento || new Date())
                d.setMonth(d.getMonth() + 1, 0)
                setForm(p => ({ ...p, data_scadenza: d.toISOString().split('T')[0] }))
              }} style={{ ...btn('#64748b', { fontSize: 13 }), padding: '8px 14px' }}>Fine mese</button>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
            <div style={{ fontSize: 14 }}>Importo da pagare: <b style={{ fontSize: 18, color: '#1d4ed8' }}>euro{totDocumento.toFixed(2)}</b></div>
            {form.data_scadenza && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Scadenza: {new Date(form.data_scadenza).toLocaleDateString('it-IT')}</div>}
          </div>
        </div>
      )}
    </div>
  )

  // LISTA
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Gestione Documenti</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>Preventivi, Ordini, DDT, Fatture, Incassi</p>
        </div>
        <button onClick={() => { setDocId(null); setForm({ ...emptyForm }); setRighe([{ ...emptyRiga }]); setTabForm('testata'); setView('form') }} style={btn('#3b82f6')}>+ Nuovo Documento</button>
      </div>
      <Err /><Suc />

      {/* Filtri */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...inp(), maxWidth: 220 }} value={cerca} onChange={e => setCerca(e.target.value)} placeholder="Cerca numero o cliente..." />
        <select style={{ ...inp(), maxWidth: 160 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="tutti">Tutti i tipi</option>
          {TIPI_DOC.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select style={{ ...inp(), maxWidth: 140 }} value={filtroStato} onChange={e => setFiltroStato(e.target.value)}>
          <option value="tutti">Tutti gli stati</option>
          {['bozza', 'confermato', 'spedito', 'fatturato', 'annullato'].map(s => <option key={s}>{s}</option>)}
        </select>
        <input style={{ ...inp(), maxWidth: 160 }} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} placeholder="Cliente..." />
        <input type="date" style={{ ...inp(), maxWidth: 140 }} value={filtroDal} onChange={e => setFiltroDal(e.target.value)} />
        <input type="date" style={{ ...inp(), maxWidth: 140 }} value={filtroAl} onChange={e => setFiltroAl(e.target.value)} />
        <button onClick={() => { setCerca(''); setFiltroTipo('tutti'); setFiltroStato('tutti'); setFiltroDal(''); setFiltroAl(''); setFiltroCliente('') }} style={btn('#64748b', { fontSize: 13 })}>Reset</button>
        <span style={{ fontSize: 13, color: '#64748b', marginLeft: 'auto' }}>{docFiltrati.length} doc · Tot: <b>euro{totFiltrati.toFixed(2)}</b></span>
      </div>

      {/* Tabella */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Caricamento...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Tipo', 'Numero', 'Data', 'Cliente', 'Listino', 'Pagamento', 'Totale', 'Stato', 'Azioni'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docFiltrati.length === 0 ? <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nessun documento trovato</td></tr> : docFiltrati.map(d => {
                const tipoInfo = TIPI_DOC.find(t => t.id === d.tipo)
                const statoColor: any = { bozza: '#f59e0b', confermato: '#3b82f6', spedito: '#8b5cf6', fatturato: '#10b981', annullato: '#ef4444' }
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => apriDocumento(d)}>
                    <td style={{ padding: '10px 14px' }}><span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{tipoInfo?.label || d.tipo}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>{d.numero_doc}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.data_documento ? new Date(d.data_documento).toLocaleDateString('it-IT') : '--'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 500 }}>{d.cliente_nome || '--'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.listino || '--'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.pagamento || '--'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>euro{Number(d.totale_documento || 0).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ background: (statoColor[d.stato] || '#94a3b8') + '20', color: statoColor[d.stato] || '#64748b', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>{d.stato}</span></td>
                    <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => eliminaDocumento(d.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Elimina</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
