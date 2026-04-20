'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

const TIPI_DOC = [
  { id: 'preventivo', label: 'Preventivo', color: '#3b82f6', icon: '📋' },
  { id: 'ordine', label: 'Ordine', color: '#8b5cf6', icon: '📦' },
  { id: 'ddt', label: 'DDT', color: '#f59e0b', icon: '🚚' },
  { id: 'fattura', label: 'Fattura', color: '#10b981', icon: '🧾' },
  { id: 'nota_credito', label: 'Nota Credito', color: '#ef4444', icon: '↩️' },
  { id: 'incasso', label: 'Incasso', color: '#06b6d4', icon: '💰' },
]
const STATI = ['bozza', 'confermato', 'spedito', 'fatturato', 'pagato', 'annullato']
const LISTINI = ['Base', 'Premium', 'Rivenditori', 'Ingrosso']
const PAGAMENTI = ['contanti', 'carta', 'bonifico', 'assegno', '30gg', '60gg', '90gg', 'credito']

type Riga = {
  id: string; articolo_id?: string; codice: string; variante: string; colore: string
  dis_taglia: string; descrizione: string; um: string; qta: number
  prezzo: number; sconto1: number; sconto2: number; iva: number
  imponibile: number; importo_iva: number; importo: number; note: string
}

const emptyRiga = (): Riga => ({
  id: crypto.randomUUID(), articolo_id: undefined, codice: '', variante: '', colore: '',
  dis_taglia: '', descrizione: '', um: 'Pz', qta: 1, prezzo: 0,
  sconto1: 0, sconto2: 0, iva: 22, imponibile: 0, importo_iva: 0, importo: 0, note: ''
})

const emptyDoc = () => ({
  tipo: 'preventivo', causale: '', cliente_id: '', cliente_nome: '', cliente_codice: '',
  cliente_indirizzo: '', cliente_piva: '', cliente_cf: '',
  data_registrazione: new Date().toISOString().split('T')[0],
  data_documento: new Date().toISOString().split('T')[0],
  data_consegna: '', pagamento: 'contanti', listino: 'Base',
  agente: '', bollettatore: '', deposito: '1', nome_deposito: '',
  tipo_bolla: 'banco', dest_nome: '', dest_indirizzo: '', dest_cap: '', dest_citta: '', dest_provincia: '',
  stato: 'bozza', note: '', note_interne: '', doc_riferimento: ''
})

function calcolaRiga(r: Riga): Riga {
  const imponibile = Math.round(r.qta * r.prezzo * (1 - r.sconto1 / 100) * (1 - r.sconto2 / 100) * 100) / 100
  const importo_iva = Math.round(imponibile * r.iva / 100 * 100) / 100
  return { ...r, imponibile, importo_iva, importo: Math.round((imponibile + importo_iva) * 100) / 100 }
}

export default function DocumentiPage() {
  const [view, setView] = useState<'lista' | 'nuovo' | 'modifica'>('lista')
  const [documenti, setDocumenti] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [articoli, setArticoli] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [docId, setDocId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyDoc())
  const [righe, setRighe] = useState<Riga[]>([emptyRiga()])
  const [tab, setTab] = useState<'testata' | 'righe' | 'scadenze' | 'destinatario' | 'note'>('testata')
  // Filtri lista
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStato, setFiltroStato] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [cercaDoc, setCercaDoc] = useState('')
  // Ricerca articolo nelle righe
  const [cercaArticolo, setCercaArticolo] = useState('')
  const [showCercaArticolo, setShowCercaArticolo] = useState<string | null>(null)
  // Ricerca cliente
  const [cercaCliente, setCercaCliente] = useState('')
  const [showCercaCliente, setShowCercaCliente] = useState(false)

  useEffect(() => { loadDocumenti(); loadClienti(); loadArticoli() }, [])

  async function loadDocumenti() {
    setLoading(true)
    const { data } = await supabaseAdmin.from('documenti').select('*').order('data_documento', { ascending: false })
    setDocumenti(data || [])
    setLoading(false)
  }
  async function loadClienti() {
    const { data } = await supabaseAdmin.from('clienti').select('*').order('nome')
    setClienti(data || [])
  }
  async function loadArticoli() {
    const { data } = await supabaseAdmin.from('articoli').select('*').eq('stato', 'attivo').order('nome')
    setArticoli(data || [])
  }

  async function generaNumeroDoc(tipo: string) {
    const anno = new Date().getFullYear()
    const prefix = tipo === 'preventivo' ? 'PV' : tipo === 'fattura' ? 'FT' : tipo === 'ddt' ? 'DDT' : tipo === 'ordine' ? 'OR' : tipo === 'nota_credito' ? 'NC' : 'INC'
    const { data } = await supabaseAdmin.from('documenti').select('id').eq('tipo', tipo).gte('created_at', `${anno}-01-01`)
    const n = (data?.length || 0) + 1
    return `${anno}_${prefix}${String(n).padStart(5, '0')}`
  }

  function selezionaCliente(c: any) {
    setForm(f => ({
      ...f, cliente_id: c.id, cliente_nome: c.nome, cliente_codice: c.codice || '',
      cliente_indirizzo: [c.indirizzo, c.cap, c.citta, c.provincia].filter(Boolean).join(', '),
      cliente_piva: c.piva || '', cliente_cf: c.cf || '',
      listino: c.listino || f.listino, pagamento: c.pagamento || f.pagamento
    }))
    setShowCercaCliente(false); setCercaCliente('')
  }

  function selezionaArticoloRiga(rigaId: string, art: any) {
    const prezzoBase = form.listino === 'Premium' ? (art.prezzo_premium || art.prezzo_base || 0)
      : form.listino === 'Rivenditori' ? (art.prezzo_rivenditori || art.prezzo_base || 0)
      : form.listino === 'Ingrosso' ? (art.prezzo_base || 0) * 0.75
      : art.prezzo_base || 0
    setRighe(prev => prev.map(r => {
      if (r.id !== rigaId) return r
      return calcolaRiga({ ...r, articolo_id: art.id, codice: art.codice || '', descrizione: art.nome, prezzo: prezzoBase })
    }))
    setShowCercaArticolo(null); setCercaArticolo('')
  }

  function aggiornaRiga(id: string, field: keyof Riga, value: any) {
    setRighe(prev => prev.map(r => {
      if (r.id !== id) return r
      return calcolaRiga({ ...r, [field]: value })
    }))
  }

  function aggiungiRiga() { setRighe(prev => [...prev, emptyRiga()]) }
  function rimuoviRiga(id: string) { setRighe(prev => prev.filter(r => r.id !== id)) }

  const totImponibile = righe.reduce((s, r) => s + r.imponibile, 0)
  const totIva = righe.reduce((s, r) => s + r.importo_iva, 0)
  const totDocumento = Math.round((totImponibile + totIva) * 100) / 100

  async function salvaDocumento() {
    if (!form.tipo) { setError('Tipo documento obbligatorio'); return }
    setSaving(true); setError(''); setSuccess('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID

    let numDoc = docId ? (documenti.find(d => d.id === docId)?.numero_doc || '') : await generaNumeroDoc(form.tipo)

    const payload = {
      ...form, user_id: uid, numero_doc: numDoc,
      anno: new Date().getFullYear(),
      totale_imponibile: totImponibile, totale_iva: totIva, totale_documento: totDocumento,
      updated_at: new Date().toISOString(),
      data_registrazione: form.data_registrazione || null,
      data_documento: form.data_documento || null,
      data_consegna: form.data_consegna || null,
      data_scadenza: form.data_scadenza || null
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
    const righePayload = righe.filter(r => r.descrizione.trim()).map((r, i) => ({
      ...r, documento_id: docSalvato.id, user_id: uid, riga_num: i + 1
    }))
    if (righePayload.length > 0) await supabaseAdmin.from('documenti_righe').insert(righePayload)

    // Aggiorna mastino se è un documento di vendita/incasso
    if (form.cliente_id && ['preventivo', 'fattura', 'ordine', 'ddt'].includes(form.tipo)) {
      const { data: lastMov } = await supabaseAdmin.from('mastino_clienti')
        .select('saldo_progressivo').eq('cliente_id', form.cliente_id)
        .order('created_at', { ascending: false }).limit(1)
      const saldoPrecedente = lastMov?.[0]?.saldo_progressivo || 0

      if (!docId) { // solo per nuovi documenti
        await supabaseAdmin.from('mastino_clienti').insert([{
          user_id: uid, cliente_id: form.cliente_id, cliente_nome: form.cliente_nome,
          documento_id: docSalvato.id, numero_doc: numDoc,
          data_movimento: form.data_documento,
          causale: `${TIPI_DOC.find(t => t.id === form.tipo)?.label} - ${numDoc}`,
          tipo_movimento: 'dare', importo_dare: totDocumento, importo_avere: 0,
          saldo_progressivo: saldoPrecedente + totDocumento,
          data_scadenza: form.data_scadenza || null, pagato: false
        }])
        // Scadenzario
        if (form.data_scadenza) {
          await supabaseAdmin.from('scadenzario').insert([{
            user_id: uid, cliente_id: form.cliente_id, cliente_nome: form.cliente_nome,
            documento_id: docSalvato.id, numero_doc: numDoc,
            data_scadenza: form.data_scadenza, importo: totDocumento, importo_residuo: totDocumento, pagato: false
          }])
        }
      }
    }

    setSuccess(`✅ Documento ${numDoc} salvato!`)
    loadDocumenti()
    setTimeout(() => { setSuccess(''); setView('lista') }, 2000)
    setSaving(false)
  }

  async function apriModifica(doc: any) {
    setDocId(doc.id)
    setForm({
      tipo: doc.tipo, causale: doc.causale || '', cliente_id: doc.cliente_id || '',
      cliente_nome: doc.cliente_nome || '', cliente_codice: doc.cliente_codice || '',
      cliente_indirizzo: doc.cliente_indirizzo || '', cliente_piva: doc.cliente_piva || '',
      cliente_cf: doc.cliente_cf || '', data_registrazione: doc.data_registrazione || '',
      data_documento: doc.data_documento || '', data_consegna: doc.data_consegna || '',
      pagamento: doc.pagamento || 'contanti', listino: doc.listino || 'Base',
      agente: doc.agente || '', bollettatore: doc.bollettatore || '',
      deposito: doc.deposito || '1', nome_deposito: doc.nome_deposito || '',
      tipo_bolla: doc.tipo_bolla || 'banco', dest_nome: doc.dest_nome || '',
      dest_indirizzo: doc.dest_indirizzo || '', dest_cap: doc.dest_cap || '',
      dest_citta: doc.dest_citta || '', dest_provincia: doc.dest_provincia || '',
      stato: doc.stato || 'bozza', note: doc.note || '', note_interne: doc.note_interne || '',
      doc_riferimento: doc.doc_riferimento || ''
    })
    const { data: r } = await supabaseAdmin.from('documenti_righe').select('*').eq('documento_id', doc.id).order('riga_num')
    setRighe(r?.length ? r.map(x => ({ ...x, id: x.id || crypto.randomUUID() })) : [emptyRiga()])
    setTab('testata'); setView('modifica')
  }

  async function eliminaDocumento(id: string) {
    if (!confirm('Eliminare questo documento?')) return
    await supabaseAdmin.from('documenti').delete().eq('id', id)
    loadDocumenti()
  }

  function nuovoDocumento() {
    setDocId(null); setForm(emptyDoc()); setRighe([emptyRiga()]); setTab('testata'); setView('nuovo')
  }

  // Filtri
  const docFiltrati = documenti.filter(d => {
    if (filtroTipo && d.tipo !== filtroTipo) return false
    if (filtroStato && d.stato !== filtroStato) return false
    if (filtroCliente && !d.cliente_nome?.toLowerCase().includes(filtroCliente.toLowerCase())) return false
    if (filtroDal && d.data_documento < filtroDal) return false
    if (filtroAl && d.data_documento > filtroAl) return false
    if (cercaDoc && !d.numero_doc?.includes(cercaDoc) && !d.cliente_nome?.toLowerCase().includes(cercaDoc.toLowerCase())) return false
    return true
  })

  const totFiltrati = { n: docFiltrati.length, imp: docFiltrati.reduce((s, d) => s + Number(d.totale_documento || 0), 0) }

  // ── LISTA ──────────────────────────────────────────────────────────────────
  if (view === 'lista') return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', margin: 0 }}>📄 Gestione Documenti</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Preventivi, Ordini, DDT, Fatture, Incassi</p>
        </div>
        <button onClick={nuovoDocumento} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          + Nuovo Documento
        </button>
      </div>

      {/* Filtri */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={cercaDoc} onChange={e => setCercaDoc(e.target.value)} placeholder="🔍 Cerca numero o cliente..."
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, minWidth: 200 }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
          <option value="">Tutti i tipi</option>
          {TIPI_DOC.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <select value={filtroStato} onChange={e => setFiltroStato(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
          <option value="">Tutti gli stati</option>
          {STATI.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} placeholder="Cliente..."
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, minWidth: 150 }} />
        <input type="date" value={filtroDal} onChange={e => setFiltroDal(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <input type="date" value={filtroAl} onChange={e => setFiltroAl(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
        <button onClick={() => { setFiltroTipo(''); setFiltroStato(''); setFiltroCliente(''); setFiltroDal(''); setFiltroAl(''); setCercaDoc('') }}
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13 }}>✕ Reset</button>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b' }}>
          <strong>{totFiltrati.n}</strong> doc · Tot: <strong style={{ color: '#059669' }}>€{totFiltrati.imp.toFixed(2)}</strong>
        </div>
      </div>

      {/* Tabella */}
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Tipo', 'Numero', 'Data', 'Cliente', 'Listino', 'Pagamento', 'Totale', 'Stato', 'Azioni'].map(h => (
              <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {docFiltrati.map((d, i) => {
              const tipo = TIPI_DOC.find(t => t.id === d.tipo)
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0f9ff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#fafafa'}>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ background: tipo?.color + '20', color: tipo?.color, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 700 }}>{tipo?.icon} {tipo?.label}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{d.numero_doc}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13 }}>{d.data_documento ? new Date(d.data_documento).toLocaleDateString('it-IT') : '-'}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13 }}>{d.cliente_nome || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12 }}>{d.listino || 'Base'}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12 }}>{d.pagamento || '-'}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: '#059669', fontSize: 14 }}>€{Number(d.totale_documento || 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                      background: d.stato === 'pagato' ? '#d1fae5' : d.stato === 'annullato' ? '#fee2e2' : d.stato === 'confermato' ? '#dbeafe' : '#fef3c7',
                      color: d.stato === 'pagato' ? '#065f46' : d.stato === 'annullato' ? '#dc2626' : d.stato === 'confermato' ? '#1d4ed8' : '#92400e'
                    }}>{d.stato}</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => apriModifica(d)} style={{ background: '#eff6ff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>✏️ Modifica</button>
                      <button onClick={() => eliminaDocumento(d.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 600 }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {docFiltrati.length === 0 && <tr><td colSpan={9} style={{ padding: 50, textAlign: 'center', color: '#94a3b8' }}>
              {loading ? '⏳ Caricamento...' : 'Nessun documento trovato'}
            </td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── FORM DOCUMENTO ─────────────────────────────────────────────────────────
  const tipoInfo = TIPI_DOC.find(t => t.id === form.tipo)
  const clientiFiltrati = clienti.filter(c => !cercaCliente || c.nome?.toLowerCase().includes(cercaCliente.toLowerCase()) || c.codice?.toLowerCase().includes(cercaCliente.toLowerCase()))
  const artFiltrati = articoli.filter(a => !cercaArticolo || a.nome?.toLowerCase().includes(cercaArticolo.toLowerCase()) || a.codice?.toLowerCase().includes(cercaArticolo.toLowerCase()))

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header form */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => setView('lista')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>← Lista</button>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>
          {view === 'nuovo' ? '+ Nuovo Documento' : `✏️ Modifica ${documenti.find(d => d.id === docId)?.numero_doc || ''}`}
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setView('lista')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
          <button onClick={salvaDocumento} disabled={saving} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', cursor: 'pointer', fontWeight: 700 }}>
            {saving ? '⏳ Salvataggio...' : '💾 Salva'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '10px 16px', marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 16px', marginBottom: 12 }}>{success}</div>}

      {/* Tipo documento */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>TIPO DOCUMENTO</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIPI_DOC.map(t => (
            <button key={t.id} onClick={() => setForm(f => ({ ...f, tipo: t.id }))} style={{
              padding: '8px 16px', borderRadius: 8, border: `2px solid ${form.tipo === t.id ? t.color : '#e2e8f0'}`,
              background: form.tipo === t.id ? t.color + '15' : '#fff', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, color: form.tipo === t.id ? t.color : '#374151'
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab navigazione */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 0, background: '#fff', borderRadius: '12px 12px 0 0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {[['testata', 'Testata'], ['righe', 'Righe Articoli'], ['scadenze', 'Scadenze'], ['destinatario', 'Destinatario'], ['note', 'Note']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{
            flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === id ? '#3b82f6' : '#f8fafc', color: tab === id ? '#fff' : '#64748b',
            borderBottom: tab === id ? 'none' : '2px solid #e2e8f0'
          }}>{label}</button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>

        {/* TAB TESTATA */}
        {tab === 'testata' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Cliente */}
            <div style={{ gridColumn: '1/-1', background: '#f8fafc', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>CLIENTE</div>
              {form.cliente_nome ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>{form.cliente_nome}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{form.cliente_indirizzo}</div>
                    {form.cliente_piva && <div style={{ fontSize: 12, color: '#94a3b8' }}>P.IVA: {form.cliente_piva}</div>}
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, cliente_id: '', cliente_nome: '', cliente_indirizzo: '', cliente_piva: '', cliente_cf: '' }))}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>Cambia</button>
                </div>
              ) : (
                <button onClick={() => setShowCercaCliente(true)} style={{ background: '#eff6ff', border: '2px dashed #bfdbfe', borderRadius: 8, padding: '12px 20px', cursor: 'pointer', color: '#3b82f6', fontWeight: 600, width: '100%' }}>
                  + Seleziona Cliente
                </button>
              )}
            </div>

            {/* Date e numero */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATA REGISTRAZIONE</label>
              <input type="date" value={form.data_registrazione} onChange={e => setForm(f => ({ ...f, data_registrazione: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATA DOCUMENTO</label>
              <input type="date" value={form.data_documento} onChange={e => setForm(f => ({ ...f, data_documento: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>CAUSALE</label>
              <input value={form.causale} onChange={e => setForm(f => ({ ...f, causale: e.target.value }))} placeholder="es: Preventivo cliente..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>LISTINO</label>
              <select value={form.listino} onChange={e => setForm(f => ({ ...f, listino: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}>
                {LISTINI.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>PAGAMENTO</label>
              <select value={form.pagamento} onChange={e => setForm(f => ({ ...f, pagamento: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}>
                {PAGAMENTI.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>STATO</label>
              <select value={form.stato} onChange={e => setForm(f => ({ ...f, stato: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}>
                {STATI.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>AGENTE</label>
              <input value={form.agente} onChange={e => setForm(f => ({ ...f, agente: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>BOLLETTATORE</label>
              <input value={form.bollettatore} onChange={e => setForm(f => ({ ...f, bollettatore: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>TIPO BOLLA</label>
              <select value={form.tipo_bolla} onChange={e => setForm(f => ({ ...f, tipo_bolla: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}>
                <option value="banco">Banco</option>
                <option value="porto_franco">Porto Franco</option>
                <option value="porto_assegnato">Porto Assegnato</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>RIF. DOCUMENTO</label>
              <input value={form.doc_riferimento} onChange={e => setForm(f => ({ ...f, doc_riferimento: e.target.value }))} placeholder="N. documento di riferimento"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
        )}

        {/* TAB RIGHE */}
        {tab === 'righe' && (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead><tr style={{ background: '#1e293b' }}>
                  {['Var.', 'Colore', 'Dis/Taglia', 'Descrizione Articolo', 'UM', 'Qta', 'Prezzo', '%Sc1', '%Sc2', '%IVA', 'Imponibile', 'Importo', ''].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {righe.map((r, i) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '6px 4px' }}>
                        <input value={r.variante} onChange={e => aggiornaRiga(r.id, 'variante', e.target.value)}
                          style={{ width: 50, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input value={r.colore} onChange={e => aggiornaRiga(r.id, 'colore', e.target.value)}
                          style={{ width: 90, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input value={r.dis_taglia} onChange={e => aggiornaRiga(r.id, 'dis_taglia', e.target.value)}
                          style={{ width: 80, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '6px 4px', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input value={r.descrizione} onChange={e => aggiornaRiga(r.id, 'descrizione', e.target.value)}
                            placeholder="Descrizione articolo..." style={{ flex: 1, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, minWidth: 180 }} />
                          <button onClick={() => { setShowCercaArticolo(r.id); setCercaArticolo('') }}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#eff6ff', cursor: 'pointer', fontSize: 11, color: '#3b82f6', whiteSpace: 'nowrap' }}>🔍</button>
                        </div>
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input value={r.um} onChange={e => aggiornaRiga(r.id, 'um', e.target.value)}
                          style={{ width: 40, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input type="number" value={r.qta} onChange={e => aggiornaRiga(r.id, 'qta', Number(e.target.value))} min={0}
                          style={{ width: 55, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input type="number" value={r.prezzo} onChange={e => aggiornaRiga(r.id, 'prezzo', Number(e.target.value))} min={0} step={0.01}
                          style={{ width: 70, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input type="number" value={r.sconto1} onChange={e => aggiornaRiga(r.id, 'sconto1', Number(e.target.value))} min={0} max={100}
                          style={{ width: 45, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input type="number" value={r.sconto2} onChange={e => aggiornaRiga(r.id, 'sconto2', Number(e.target.value))} min={0} max={100}
                          style={{ width: 45, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <input type="number" value={r.iva} onChange={e => aggiornaRiga(r.id, 'iva', Number(e.target.value))} min={0}
                          style={{ width: 45, padding: '4px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13, color: '#374151', textAlign: 'right' }}>€{r.imponibile.toFixed(2)}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 700, fontSize: 13, color: '#059669', textAlign: 'right' }}>€{r.importo.toFixed(2)}</td>
                      <td style={{ padding: '6px 4px' }}>
                        <button onClick={() => rimuoviRiga(r.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 13 }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={aggiungiRiga} style={{ marginTop: 12, background: '#eff6ff', border: '2px dashed #bfdbfe', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', color: '#3b82f6', fontWeight: 600 }}>+ Aggiungi riga</button>

            {/* Totali righe */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 24px', minWidth: 280, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#64748b' }}>
                  <span>Totale Imponibile</span><span>€{totImponibile.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: '#64748b' }}>
                  <span>Totale IVA</span><span>€{totIva.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#1e293b', borderTop: '2px solid #e2e8f0', paddingTop: 8 }}>
                  <span>TOTALE DOCUMENTO</span><span>€{totDocumento.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB SCADENZE */}
        {tab === 'scadenze' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATA SCADENZA PAGAMENTO</label>
              <input type="date" value={form.data_scadenza} onChange={e => setForm(f => ({ ...f, data_scadenza: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>DATA CONSEGNA</label>
              <input type="date" value={form.data_consegna} onChange={e => setForm(f => ({ ...f, data_consegna: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1/-1', background: '#fffbeb', borderRadius: 10, padding: 16, border: '1px solid #fde68a' }}>
              <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>💡 Calcolo automatico scadenza</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['30gg', '60gg', '90gg', 'fine_mese'].map(p => (
                  <button key={p} onClick={() => {
                    const d = new Date(form.data_documento)
                    const gg = p === '30gg' ? 30 : p === '60gg' ? 60 : p === '90gg' ? 90 : 0
                    if (gg > 0) { d.setDate(d.getDate() + gg); setForm(f => ({ ...f, data_scadenza: d.toISOString().split('T')[0] })) }
                    else { d.setMonth(d.getMonth() + 1, 0); setForm(f => ({ ...f, data_scadenza: d.toISOString().split('T')[0] })) }
                  }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #fde68a', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB DESTINATARIO */}
        {tab === 'destinatario' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['dest_nome', 'RAGIONE SOCIALE'], ['dest_indirizzo', 'INDIRIZZO'], ['dest_cap', 'CAP'], ['dest_citta', 'CITTÀ'], ['dest_provincia', 'PROVINCIA']].map(([field, label]) => (
              <div key={field} style={field === 'dest_nome' || field === 'dest_indirizzo' ? { gridColumn: '1/-1' } : {}}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>{label}</label>
                <input value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ gridColumn: '1/-1' }}>
              <button onClick={() => setForm(f => ({ ...f, dest_nome: f.cliente_nome, dest_indirizzo: f.cliente_indirizzo }))}
                style={{ background: '#eff6ff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', color: '#3b82f6', fontWeight: 600 }}>
                📋 Copia da cliente
              </button>
            </div>
          </div>
        )}

        {/* TAB NOTE */}
        {tab === 'note' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>NOTE DOCUMENTO (visibili in stampa)</label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>NOTE INTERNE (non visibili in stampa)</label>
              <textarea value={form.note_interne} onChange={e => setForm(f => ({ ...f, note_interne: e.target.value }))} rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
      </div>

      {/* MODAL CERCA CLIENTE */}
      {showCercaCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 500, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Seleziona Cliente</h3>
              <button onClick={() => setShowCercaCliente(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <input value={cercaCliente} onChange={e => setCercaCliente(e.target.value)} placeholder="🔍 Cerca..." autoFocus
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 12 }} />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {clientiFiltrati.slice(0, 30).map(c => (
                <button key={c.id} onClick={() => selezionaCliente(c)} style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 6 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#eff6ff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}>
                  <div style={{ fontWeight: 700 }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{c.codice && `Cod: ${c.codice} · `}{c.citta || ''}{c.piva ? ` · P.IVA: ${c.piva}` : ''}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CERCA ARTICOLO */}
      {showCercaArticolo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 600, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Cerca Articolo</h3>
              <button onClick={() => setShowCercaArticolo(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <input value={cercaArticolo} onChange={e => setCercaArticolo(e.target.value)} placeholder="🔍 Cerca per nome o codice..." autoFocus
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 12 }} />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {['Codice', 'Nome', 'Base', 'Premium', 'Rivenditori', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {artFiltrati.slice(0, 30).map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0f9ff'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                      <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>{a.codice}</td>
                      <td style={{ padding: '8px 10px', fontSize: 13 }}>{a.nome}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12 }}>€{Number(a.prezzo_base || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12 }}>€{Number(a.prezzo_premium || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px', fontSize: 12 }}>€{Number(a.prezzo_rivenditori || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <button onClick={() => selezionaArticoloRiga(showCercaArticolo!, a)}
                          style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Aggiungi</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
