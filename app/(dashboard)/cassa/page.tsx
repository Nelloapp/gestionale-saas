'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

type RigaCarrello = {
  id: string; articolo_id?: string; codice: string; nome: string
  variante?: string; colore?: string
  qta: number; prezzo: number; sconto: number; iva: number; totale: number
}

const LISTINI = ['Base', 'Premium', 'Rivenditori', 'Ingrosso']
const PAGAMENTI = [
  { id: 'contanti', label: 'Contanti', icon: '💵' },
  { id: 'carta', label: 'Carta/POS', icon: '💳' },
  { id: 'bonifico', label: 'Bonifico', icon: '🏦' },
  { id: 'assegno', label: 'Assegno', icon: '📄' },
  { id: 'credito', label: 'A Credito', icon: '📋' },
  { id: '30gg', label: '30 giorni', icon: '📅' },
  { id: '60gg', label: '60 giorni', icon: '📅' },
  { id: '90gg', label: '90 giorni', icon: '📅' },
]

export default function CassaPage() {
  const [modalita, setModalita] = useState<'home' | 'veloce' | 'scan' | 'archivio'>('home')
  const [articoli, setArticoli] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [carrello, setCarrello] = useState<RigaCarrello[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [cerca, setCerca] = useState('')
  const [cercaCliente, setCercaCliente] = useState('')
  const [showCercaCliente, setShowCercaCliente] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [scanFeedback, setScanFeedback] = useState<'ok' | 'error' | null>(null)
  const [pagamento, setPagamento] = useState('contanti')
  const [listino, setListino] = useState('Base')
  const [scontoTotale, setScontoTotale] = useState(0)
  const [showPaga, setShowPaga] = useState(false)
  const [contantiDati, setContantiDati] = useState(0)
  const [vendite, setVendite] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [showNota, setShowNota] = useState(false)
  const [prezzoCustom, setPrezzoCustom] = useState<{[id: string]: number}>({})
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadArticoli(); loadClienti(); loadVendite() }, [])
  useEffect(() => { if (modalita === 'scan' && barcodeRef.current) barcodeRef.current.focus() }, [modalita])

  async function loadArticoli() {
    const { data } = await supabaseAdmin.from('articoli').select('*').eq('stato', 'attivo')
    setArticoli(data || [])
  }
  async function loadClienti() {
    const { data } = await supabaseAdmin.from('clienti').select('*').eq('stato', 'attivo').order('nome')
    setClienti(data || [])
  }
  async function loadVendite() {
    const { data } = await supabaseAdmin.from('vendite').select('*').order('created_at', { ascending: false }).limit(30)
    setVendite(data || [])
  }

  function getPrezzoListino(art: any) {
    const l = listino.toLowerCase()
    if (l === 'premium') return art.prezzo_premium || art.prezzo_base || 0
    if (l === 'rivenditori') return art.prezzo_rivenditori || art.prezzo_base || 0
    if (l === 'ingrosso') return (art.prezzo_base || 0) * 0.75
    return art.prezzo_base || 0
  }

  function aggiungiAlCarrello(art: any, qtaExtra = 1) {
    const prezzo = getPrezzoListino(art)
    const scontoCliente = clienteSelezionato?.sconto || 0
    setCarrello(prev => {
      const idx = prev.findIndex(r => r.articolo_id === art.id)
      if (idx >= 0) {
        const updated = [...prev]
        const r = updated[idx]
        const newQta = r.qta + qtaExtra
        updated[idx] = { ...r, qta: newQta, totale: Math.round(newQta * r.prezzo * (1 - r.sconto / 100) * 100) / 100 }
        return updated
      }
      const id = crypto.randomUUID()
      return [...prev, {
        id, articolo_id: art.id, codice: art.codice, nome: art.nome,
        variante: art.variante || '', colore: art.colore || '',
        qta: qtaExtra, prezzo, sconto: scontoCliente, iva: 22,
        totale: Math.round(qtaExtra * prezzo * (1 - scontoCliente / 100) * 100) / 100
      }]
    })
  }

  function rimuoviRiga(id: string) { setCarrello(prev => prev.filter(r => r.id !== id)) }

  function aggiornaQta(id: string, delta: number) {
    setCarrello(prev => prev.map(r => {
      if (r.id !== id) return r
      const newQta = Math.max(0.5, r.qta + delta)
      return { ...r, qta: newQta, totale: Math.round(newQta * r.prezzo * (1 - r.sconto / 100) * 100) / 100 }
    }).filter(r => r.qta > 0))
  }

  function aggiornaPrezzoRiga(id: string, nuovoPrezzo: number) {
    setCarrello(prev => prev.map(r => {
      if (r.id !== id) return r
      return { ...r, prezzo: nuovoPrezzo, totale: Math.round(r.qta * nuovoPrezzo * (1 - r.sconto / 100) * 100) / 100 }
    }))
  }

  function aggiornaScontoRiga(id: string, nuovoSconto: number) {
    setCarrello(prev => prev.map(r => {
      if (r.id !== id) return r
      return { ...r, sconto: nuovoSconto, totale: Math.round(r.qta * r.prezzo * (1 - nuovoSconto / 100) * 100) / 100 }
    }))
  }

  function handleBarcode(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const code = barcode.trim()
    const art = articoli.find(a => a.ean === code || a.codice === code)
    if (art) { aggiungiAlCarrello(art); setScanFeedback('ok'); setUltimoScan(art.nome) }
    else { setScanFeedback('error'); setUltimoScan(code) }
    setBarcode('')
    setTimeout(() => setScanFeedback(null), 2000)
  }
  const [ultimoScan, setUltimoScan] = useState('')

  const totaleImponibile = carrello.reduce((s, r) => s + r.totale, 0)
  const scontoEuro = totaleImponibile * scontoTotale / 100
  const imponibileNetto = totaleImponibile - scontoEuro
  const totaleIva = Math.round(imponibileNetto * 0.22 * 100) / 100
  const totaleDovuto = Math.round((imponibileNetto + totaleIva) * 100) / 100
  const resto = Math.max(0, contantiDati - totaleDovuto)

  async function completaVendita() {
    if (carrello.length === 0) { setError('Carrello vuoto'); return }
    setLoading(true); setError(''); setSuccess('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID

    // Genera numero documento
    const anno = new Date().getFullYear()
    const { data: lastDoc } = await supabaseAdmin.from('vendite').select('id').order('created_at', { ascending: false }).limit(1)
    const progr = (lastDoc?.length || 0) + 1
    const numDoc = `${anno}_VE${String(progr).padStart(5, '0')}`

    // Salva vendita
    const { data: vendita, error: ve } = await supabaseAdmin.from('vendite').insert([{
      user_id: uid,
      cliente_id: clienteSelezionato?.id || null,
      cliente_nome: clienteSelezionato?.nome || 'Cliente generico',
      totale: totaleDovuto,
      pagamento,
      listino,
      sconto_totale: scontoTotale,
      note,
      created_at: new Date().toISOString()
    }]).select().single()

    if (ve || !vendita) { setError('Errore salvataggio: ' + (ve?.message || 'Sconosciuto')); setLoading(false); return }

    // Salva righe vendita
    await supabaseAdmin.from('vendite_righe').insert(carrello.map(r => ({
      vendita_id: vendita.id, user_id: uid,
      articolo_id: r.articolo_id, codice: r.codice, nome: r.nome,
      qta: r.qta, prezzo_unitario: r.prezzo, sconto: r.sconto, iva: r.iva, totale: r.totale
    })))

    // Aggiorna stock articoli
    for (const r of carrello) {
      if (r.articolo_id) {
        const art = articoli.find(a => a.id === r.articolo_id)
        if (art) await supabaseAdmin.from('articoli').update({ stock: Math.max(0, (art.stock || 0) - r.qta) }).eq('id', r.articolo_id)
      }
    }

    // Se cliente, aggiorna mastino
    if (clienteSelezionato) {
      // Calcola saldo attuale
      const { data: lastMov } = await supabaseAdmin.from('mastino_clienti')
        .select('saldo_progressivo').eq('cliente_id', clienteSelezionato.id)
        .order('created_at', { ascending: false }).limit(1)
      const saldoPrecedente = lastMov?.[0]?.saldo_progressivo || 0

      if (pagamento === 'credito' || pagamento === '30gg' || pagamento === '60gg' || pagamento === '90gg') {
        // Vendita a credito: movimento DARE
        const gg = pagamento === '30gg' ? 30 : pagamento === '60gg' ? 60 : pagamento === '90gg' ? 90 : 0
        const dataScad = gg > 0 ? new Date(Date.now() + gg * 86400000).toISOString().split('T')[0] : null
        await supabaseAdmin.from('mastino_clienti').insert([{
          user_id: uid, cliente_id: clienteSelezionato.id, cliente_nome: clienteSelezionato.nome,
          documento_id: vendita.id, numero_doc: numDoc,
          data_movimento: new Date().toISOString().split('T')[0],
          causale: `Vendita ${listino} - ${numDoc}`,
          tipo_movimento: 'dare', importo_dare: totaleDovuto, importo_avere: 0,
          saldo_progressivo: saldoPrecedente + totaleDovuto,
          data_scadenza: dataScad, pagato: false
        }])
        // Aggiungi a scadenzario
        if (dataScad) {
          await supabaseAdmin.from('scadenzario').insert([{
            user_id: uid, cliente_id: clienteSelezionato.id, cliente_nome: clienteSelezionato.nome,
            documento_id: vendita.id, numero_doc: numDoc,
            data_scadenza: dataScad, importo: totaleDovuto, importo_residuo: totaleDovuto, pagato: false
          }])
        }
      } else {
        // Pagamento immediato: movimento AVERE (pareggia)
        await supabaseAdmin.from('mastino_clienti').insert([{
          user_id: uid, cliente_id: clienteSelezionato.id, cliente_nome: clienteSelezionato.nome,
          documento_id: vendita.id, numero_doc: numDoc,
          data_movimento: new Date().toISOString().split('T')[0],
          causale: `Vendita ${listino} - ${numDoc} (${pagamento})`,
          tipo_movimento: 'avere', importo_dare: 0, importo_avere: totaleDovuto,
          saldo_progressivo: saldoPrecedente,
          pagato: true, data_pagamento: new Date().toISOString().split('T')[0],
          metodo_pagamento: pagamento
        }])
      }
    }

    setSuccess(`✅ Vendita completata! ${numDoc} — Totale: €${totaleDovuto.toFixed(2)}${pagamento === 'contanti' && contantiDati > 0 ? ` — Resto: €${resto.toFixed(2)}` : ''}`)
    setCarrello([]); setShowPaga(false); setClienteSelezionato(null); setNote(''); setScontoTotale(0)
    loadVendite(); loadArticoli()
    setLoading(false)
    setTimeout(() => setSuccess(''), 5000)
  }

  const artFiltrati = articoli.filter(a =>
    !cerca || a.nome?.toLowerCase().includes(cerca.toLowerCase()) ||
    a.codice?.toLowerCase().includes(cerca.toLowerCase()) ||
    a.ean?.includes(cerca)
  )
  const clientiFiltrati = clienti.filter(c =>
    !cercaCliente || c.nome?.toLowerCase().includes(cercaCliente.toLowerCase()) ||
    c.codice?.toLowerCase().includes(cercaCliente.toLowerCase())
  )

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (modalita === 'home') return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#1e293b' }}>🏪 Cassa</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Seleziona la modalità di vendita</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {[
          { id: 'veloce', icon: '⚡', label: 'Vendita Veloce', desc: 'Cerca e aggiungi articoli', color: '#3b82f6' },
          { id: 'scan', icon: '📷', label: 'Scansione Barcode', desc: 'Leggi codici a barre', color: '#8b5cf6' },
          { id: 'archivio', icon: '📋', label: 'Archivio Vendite', desc: 'Storico transazioni', color: '#10b981' },
        ].map(m => (
          <button key={m.id} onClick={() => setModalita(m.id as any)} style={{
            background: '#fff', border: `2px solid ${m.color}20`, borderRadius: 16, padding: '28px 20px',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${m.color}30` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{m.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{m.desc}</div>
          </button>
        ))}
      </div>
      {success && <div style={{ marginTop: 24, padding: '14px 20px', background: '#d1fae5', borderRadius: 10, color: '#065f46', fontWeight: 600 }}>{success}</div>}
    </div>
  )

  // ── ARCHIVIO ──────────────────────────────────────────────────────────────
  if (modalita === 'archivio') return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>← Indietro</button>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>📋 Archivio Vendite</h2>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Data', 'Cliente', 'Listino', 'Pagamento', 'Totale', 'Stato'].map(h => (
              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {vendite.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{new Date(v.created_at).toLocaleDateString('it-IT')}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{v.cliente_nome || 'Generico'}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{v.listino || 'Base'}</td>
                <td style={{ padding: '12px 16px', fontSize: 13 }}>{v.pagamento || '-'}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#059669' }}>€ {Number(v.totale || 0).toFixed(2)}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Completata</span></td>
              </tr>
            ))}
            {vendite.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Nessuna vendita registrata</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── VENDITA (veloce + scan) ───────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden', background: '#f8fafc' }}>

      {/* COLONNA SINISTRA: articoli */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #e2e8f0' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>← Indietro</button>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>
              {modalita === 'scan' ? '📷 Scansione' : '⚡ Vendita Veloce'}
            </h2>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setModalita('veloce')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: modalita === 'veloce' ? '#3b82f6' : '#f1f5f9', color: modalita === 'veloce' ? '#fff' : '#374151', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>⚡ Veloce</button>
              <button onClick={() => setModalita('scan')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: modalita === 'scan' ? '#8b5cf6' : '#f1f5f9', color: modalita === 'scan' ? '#fff' : '#374151', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>📷 Scan</button>
            </div>
          </div>

          {/* Intestazione cliente */}
          <div style={{ background: clienteSelezionato ? '#eff6ff' : '#f8fafc', border: `1px solid ${clienteSelezionato ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
            {clienteSelezionato ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 15 }}>👤 {clienteSelezionato.nome}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {clienteSelezionato.citta && `${clienteSelezionato.citta} · `}
                    {clienteSelezionato.sconto > 0 && `Sconto: ${clienteSelezionato.sconto}% · `}
                    Fido: €{Number(clienteSelezionato.fido || 0).toFixed(0)}
                  </div>
                </div>
                <button onClick={() => setClienteSelezionato(null)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 13 }}>✕ Rimuovi</button>
              </div>
            ) : (
              <button onClick={() => setShowCercaCliente(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontWeight: 600, fontSize: 14, padding: 0 }}>
                + Associa cliente (opzionale)
              </button>
            )}
          </div>

          {/* Listino e Pagamento */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>LISTINO:</span>
              {LISTINI.map(l => (
                <button key={l} onClick={() => setListino(l)} style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: listino === l ? '#3b82f6' : '#f1f5f9', color: listino === l ? '#fff' : '#374151'
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Barcode o ricerca */}
          {modalita === 'scan' ? (
            <div style={{ marginTop: 10 }}>
              <input ref={barcodeRef} value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={handleBarcode}
                placeholder="Scansiona barcode o digita codice + Invio..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `2px solid ${scanFeedback === 'ok' ? '#10b981' : scanFeedback === 'error' ? '#ef4444' : '#e2e8f0'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              {scanFeedback && <div style={{ marginTop: 6, fontSize: 13, color: scanFeedback === 'ok' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {scanFeedback === 'ok' ? `✅ ${ultimoScan}` : `❌ Articolo non trovato: ${ultimoScan}`}
              </div>}
            </div>
          ) : (
            <input value={cerca} onChange={e => setCerca(e.target.value)}
              placeholder="🔍 Cerca articolo per nome, codice o EAN..."
              style={{ marginTop: 10, width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          )}
        </div>

        {/* Lista articoli */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {modalita === 'veloce' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {artFiltrati.slice(0, 60).map(art => {
                const prezzo = getPrezzoListino(art)
                return (
                  <button key={art.id} onClick={() => aggiungiAlCarrello(art)} style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 10px',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLElement).style.background = '#eff6ff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>{art.codice}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6, lineHeight: 1.3 }}>{art.nome}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>€{prezzo.toFixed(2)}</span>
                      <span style={{ fontSize: 11, color: art.stock > 0 ? '#10b981' : '#ef4444' }}>
                        {art.stock > 0 ? `${art.stock} pz` : 'Esaurito'}
                      </span>
                    </div>
                  </button>
                )
              })}
              {artFiltrati.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#94a3b8' }}>Nessun articolo trovato</div>}
            </div>
          )}
          {modalita === 'scan' && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📷</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Pronto per la scansione</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Posiziona il cursore nel campo sopra e scansiona il barcode</div>
            </div>
          )}
        </div>
      </div>

      {/* COLONNA DESTRA: carrello */}
      <div style={{ width: 380, display: 'flex', flexDirection: 'column', background: '#fff' }}>

        {/* Header carrello */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#fff', fontWeight: 700 }}>🛒 Carrello ({carrello.length})</h3>
            {carrello.length > 0 && <button onClick={() => setCarrello([])} style={{ background: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Svuota</button>}
          </div>
          {clienteSelezionato && <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>👤 {clienteSelezionato.nome}</div>}
        </div>

        {/* Righe carrello */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {carrello.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
              <div>Carrello vuoto</div>
            </div>
          ) : carrello.map(r => (
            <div key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{r.nome}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.codice}{r.colore ? ` · ${r.colore}` : ''}</div>
                </div>
                <button onClick={() => rimuoviRiga(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: 0 }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => aggiornaQta(r.id, -1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}>−</button>
                <span style={{ minWidth: 30, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{r.qta}</span>
                <button onClick={() => aggiornaQta(r.id, 1)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}>+</button>
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>× €</span>
                <input type="number" value={r.prezzo} onChange={e => aggiornaPrezzoRiga(r.id, Number(e.target.value))}
                  style={{ width: 60, padding: '3px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>Sc%</span>
                <input type="number" value={r.sconto} onChange={e => aggiornaScontoRiga(r.id, Number(e.target.value))}
                  style={{ width: 40, padding: '3px 6px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, textAlign: 'right' }} />
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#059669', fontSize: 14 }}>€{r.totale.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Totali e pagamento */}
        <div style={{ borderTop: '2px solid #e2e8f0', padding: '16px 20px', background: '#f8fafc' }}>
          {/* Sconto totale */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b', flex: 1 }}>Sconto totale %</span>
            <input type="number" value={scontoTotale} onChange={e => setScontoTotale(Number(e.target.value))} min={0} max={100}
              style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, textAlign: 'right' }} />
          </div>

          {/* Riepilogo */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', marginBottom: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 4 }}>
              <span>Imponibile</span><span>€{totaleImponibile.toFixed(2)}</span>
            </div>
            {scontoTotale > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#ef4444', marginBottom: 4 }}>
              <span>Sconto ({scontoTotale}%)</span><span>-€{scontoEuro.toFixed(2)}</span>
            </div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginBottom: 4 }}>
              <span>IVA 22%</span><span>€{totaleIva.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: '#1e293b', borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
              <span>TOTALE</span><span>€{totaleDovuto.toFixed(2)}</span>
            </div>
          </div>

          {/* Metodo pagamento */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>PAGAMENTO</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {PAGAMENTI.map(p => (
                <button key={p.id} onClick={() => setPagamento(p.id)} style={{
                  padding: '6px 4px', borderRadius: 8, border: `2px solid ${pagamento === p.id ? '#3b82f6' : '#e2e8f0'}`,
                  background: pagamento === p.id ? '#eff6ff' : '#fff', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: pagamento === p.id ? '#1d4ed8' : '#374151', textAlign: 'center'
                }}>
                  <div style={{ fontSize: 16 }}>{p.icon}</div>
                  <div style={{ fontSize: 10 }}>{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Contanti: calcola resto */}
          {pagamento === 'contanti' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: '#fff', borderRadius: 8, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Contanti dati: €</span>
              <input type="number" value={contantiDati || ''} onChange={e => setContantiDati(Number(e.target.value))}
                style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700 }} />
              {contantiDati > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>Resto: €{resto.toFixed(2)}</span>}
            </div>
          )}

          {/* Note */}
          <button onClick={() => setShowNota(!showNota)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, marginBottom: 8, padding: 0 }}>
            {showNota ? '▼' : '▶'} Note vendita
          </button>
          {showNota && <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note..." rows={2}
            style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: '8px 10px', fontSize: 13, resize: 'none', marginBottom: 8, boxSizing: 'border-box' }} />}

          {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 8 }}>{error}</div>}

          <button onClick={completaVendita} disabled={loading || carrello.length === 0} style={{
            width: '100%', padding: '14px', borderRadius: 10, border: 'none',
            background: carrello.length === 0 ? '#e2e8f0' : '#10b981',
            color: carrello.length === 0 ? '#94a3b8' : '#fff',
            fontWeight: 800, fontSize: 16, cursor: carrello.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}>
            {loading ? '⏳ Elaborazione...' : `✅ INCASSA €${totaleDovuto.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* MODAL CERCA CLIENTE */}
      {showCercaCliente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>Seleziona Cliente</h3>
              <button onClick={() => setShowCercaCliente(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            <input value={cercaCliente} onChange={e => setCercaCliente(e.target.value)} placeholder="🔍 Cerca per nome o codice..."
              style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 12, outline: 'none' }} autoFocus />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {clientiFiltrati.slice(0, 30).map(c => (
                <button key={c.id} onClick={() => { setClienteSelezionato(c); setShowCercaCliente(false); setCercaCliente('') }}
                  style={{ width: '100%', padding: '12px 16px', background: '#f8fafc', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 6, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#eff6ff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{c.codice && `Cod: ${c.codice} · `}{c.citta || ''}{c.sconto > 0 ? ` · Sconto: ${c.sconto}%` : ''}</div>
                </button>
              ))}
              {clientiFiltrati.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>Nessun cliente trovato</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
