'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://iwvesqajdjmsuxyvplxo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dmVzcWFqZGptc3V4eXZwbHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjQ1MzAsImV4cCI6MjA5MjEwMDUzMH0.9VjwWEKzv2kUSE2eHkKg0NbwZImtEytc3V05HAG7rxw'
)

type RigaCarrello = { id: string; articolo_id?: string; codice: string; nome: string; qta: number; prezzo: number; sconto: number; iva: number; totale: number }
type Conto = { id: string; nome: string; tipo: string; stato: string; righe: RigaCarrello[] }

export default function CassaPage() {
  const [modalita, setModalita] = useState<'home' | 'veloce' | 'scan' | 'conti' | 'ingrosso' | 'archivio' | 'chiusura'>('home')
  const [articoli, setArticoli] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [carrello, setCarrello] = useState<RigaCarrello[]>([])
  const [conti, setConti] = useState<Conto[]>([])
  const [contoAttivo, setContoAttivo] = useState<string | null>(null)
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [cerca, setCerca] = useState('')
  const [barcode, setBarcode] = useState('')
  const [scanFeedback, setScanFeedback] = useState<'ok' | 'error' | null>(null)
  const [ultimoScan, setUltimoScan] = useState('')
  const [pagamento, setPagamento] = useState('contanti')
  const [contantiDati, setContantiDati] = useState(0)
  const [scontoTotale, setScontoTotale] = useState(0)
  const [showPaga, setShowPaga] = useState(false)
  const [vendite, setVendite] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadArticoli(); loadClienti(); loadConti(); loadVendite() }, [])
  useEffect(() => { if (modalita === 'scan' && barcodeRef.current) barcodeRef.current.focus() }, [modalita])

  async function loadArticoli() {
    const { data } = await supabase.from('articoli').select('*').eq('stato', 'attivo')
    setArticoli(data || [])
  }
  async function loadClienti() {
    const { data } = await supabase.from('clienti').select('*').eq('stato', 'attivo')
    setClienti(data || [])
  }
  async function loadConti() {
    const { data: contiData } = await supabase.from('conti_cassa').select('*').eq('stato', 'aperto').order('created_at', { ascending: false })
    if (contiData) {
      const contiConRighe = await Promise.all(contiData.map(async (c) => {
        const { data: righe } = await supabase.from('conti_righe').select('*').eq('conto_id', c.id)
        return { ...c, righe: (righe || []).map(r => ({ id: r.id, articolo_id: r.articolo_id, codice: r.codice, nome: r.nome, qta: r.qta, prezzo: r.prezzo_unitario, sconto: r.sconto, iva: 22, totale: r.totale })) }
      }))
      setConti(contiConRighe)
    }
  }
  async function loadVendite() {
    const { data } = await supabase.from('vendite').select('*').order('created_at', { ascending: false }).limit(50)
    setVendite(data || [])
  }

  function aggiungiAlCarrello(art: any, qta = 1) {
    const prezzo = clienteSelezionato ? (clienteSelezionato.listino === 'premium' ? art.prezzo_premium : clienteSelezionato.listino === 'rivenditori' ? art.prezzo_rivenditori : art.prezzo_base) : art.prezzo_base
    const sconto = clienteSelezionato?.sconto || 0
    setCarrello(prev => {
      const idx = prev.findIndex(r => r.articolo_id === art.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], qta: updated[idx].qta + qta, totale: (updated[idx].qta + qta) * updated[idx].prezzo * (1 - updated[idx].sconto / 100) }
        return updated
      }
      return [...prev, { id: Date.now().toString(), articolo_id: art.id, codice: art.codice, nome: art.nome, qta, prezzo, sconto, iva: art.iva, totale: qta * prezzo * (1 - sconto / 100) }]
    })
  }

  function scanBarcode(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const art = articoli.find(a => a.ean === barcode || a.codice === barcode)
      if (art) {
        aggiungiAlCarrello(art)
        setUltimoScan(art.nome)
        setScanFeedback('ok')
        setTimeout(() => setScanFeedback(null), 1500)
      } else {
        setScanFeedback('error')
        setUltimoScan('Articolo non trovato: ' + barcode)
        setTimeout(() => setScanFeedback(null), 2000)
      }
      setBarcode('')
      if (barcodeRef.current) barcodeRef.current.focus()
    }
  }

  function rimuoviDalCarrello(id: string) { setCarrello(prev => prev.filter(r => r.id !== id)) }
  function aggiornaQta(id: string, qta: number) {
    if (qta <= 0) { rimuoviDalCarrello(id); return }
    setCarrello(prev => prev.map(r => r.id === id ? { ...r, qta, totale: qta * r.prezzo * (1 - r.sconto / 100) } : r))
  }

  const subtotale = carrello.reduce((s, r) => s + r.totale, 0)
  const scontoImporto = subtotale * scontoTotale / 100
  const totale = subtotale - scontoImporto
  const resto = contantiDati - totale

  async function completaVendita(tipo: string) {
    if (carrello.length === 0) { setError('Carrello vuoto'); return }
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const numero = tipo.toUpperCase() + '-' + Date.now().toString().slice(-6)
    const { data: vendita, error: ve } = await supabase.from('vendite').insert([{
      user_id: user?.id, numero, tipo, data: new Date().toISOString().split('T')[0],
      cliente_id: clienteSelezionato?.id || null, cliente_nome: clienteSelezionato?.nome || null,
      modalita_cassa: modalita, subtotale, sconto_perc: scontoTotale, sconto_importo: scontoImporto,
      totale, iva_totale: totale - totale / (1 + 0.22), pagamento, stato: 'pagata'
    }]).select().single()
    if (ve) { setError('Errore: ' + ve.message); setLoading(false); return }
    await supabase.from('vendite_righe').insert(carrello.map(r => ({
      vendita_id: vendita.id, articolo_id: r.articolo_id || null, codice: r.codice,
      nome: r.nome, qta: r.qta, prezzo_unitario: r.prezzo, sconto: r.sconto, iva: r.iva, totale: r.totale
    })))
    // Aggiorna stock articoli
    for (const r of carrello) {
      if (r.articolo_id) {
        const art = articoli.find(a => a.id === r.articolo_id)
        if (art) await supabase.from('articoli').update({ stock: Math.max(0, art.stock - r.qta) }).eq('id', r.articolo_id)
      }
    }
    setSuccess(`${tipo.toUpperCase()} ${numero} emessa! Totale: €${totale.toFixed(2)}`)
    setCarrello([]); setScontoTotale(0); setContantiDati(0); setShowPaga(false)
    setClienteSelezionato(null); loadVendite(); loadArticoli()
    setLoading(false)
  }

  async function apriNuovoConto(nome: string, tipo: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('conti_cassa').insert([{ user_id: user?.id, nome, tipo, stato: 'aperto' }]).select().single()
    if (data) { await loadConti(); setContoAttivo(data.id) }
  }

  async function aggiungiARigaConto(contoId: string, art: any) {
    const prezzo = art.prezzo_base
    const { data: { user } } = await supabase.auth.getUser()
    const conto = conti.find(c => c.id === contoId)
    const rigaEsistente = conto?.righe.find(r => r.articolo_id === art.id)
    if (rigaEsistente) {
      const nuovaQta = rigaEsistente.qta + 1
      await supabase.from('conti_righe').update({ qta: nuovaQta, totale: nuovaQta * prezzo }).eq('id', rigaEsistente.id)
    } else {
      await supabase.from('conti_righe').insert([{ conto_id: contoId, articolo_id: art.id, codice: art.codice, nome: art.nome, qta: 1, prezzo_unitario: prezzo, sconto: 0, totale: prezzo }])
    }
    loadConti()
  }

  async function chiudiConto(contoId: string) {
    const conto = conti.find(c => c.id === contoId)
    if (!conto || conto.righe.length === 0) { setError('Conto vuoto'); return }
    setCarrello(conto.righe)
    setContoAttivo(null)
    setShowPaga(true)
    await supabase.from('conti_cassa').update({ stato: 'chiuso', closed_at: new Date().toISOString() }).eq('id', contoId)
    loadConti()
  }

  async function eliminaRigaConto(rigaId: string) {
    await supabase.from('conti_righe').delete().eq('id', rigaId)
    loadConti()
  }

  const artFiltrati = articoli.filter(a => !cerca || a.nome?.toLowerCase().includes(cerca.toLowerCase()) || a.codice?.toLowerCase().includes(cerca.toLowerCase()))
  const contoAttivoData = conti.find(c => c.id === contoAttivo)

  const kpiVendite = {
    oggi: vendite.filter(v => v.data === new Date().toISOString().split('T')[0]).length,
    totaleOggi: vendite.filter(v => v.data === new Date().toISOString().split('T')[0]).reduce((s, v) => s + v.totale, 0),
    contanti: vendite.filter(v => v.pagamento === 'contanti').reduce((s, v) => s + v.totale, 0),
    carta: vendite.filter(v => v.pagamento === 'carta').reduce((s, v) => s + v.totale, 0),
  }

  const btnModalita = (id: any, icon: string, label: string, desc: string, color: string) => (
    <button key={id} onClick={() => { setModalita(id); setCarrello([]); setScontoTotale(0); setClienteSelezionato(null) }}
      style={{ background: 'white', border: `2px solid ${color}20`, borderRadius: '16px', padding: '24px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = color)} onMouseLeave={e => (e.currentTarget.style.borderColor = color + '20')}>
      <div style={{ fontSize: '36px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>{desc}</div>
    </button>
  )

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', cursor: 'pointer' }} onClick={() => setError('')}>{error} ✕</div>}
      {success && <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', cursor: 'pointer' }} onClick={() => setSuccess('')}>{success} ✕</div>}

      {/* HOME */}
      {modalita === 'home' && (
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Cassa</h1>
          <p style={{ color: '#64748b', marginBottom: '28px' }}>Seleziona la modalità di vendita</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {btnModalita('veloce', '⚡', 'Cassa Veloce', 'Vendita rapida al dettaglio', '#f59e0b')}
            {btnModalita('scan', '📷', 'Scan & Go', 'Scansiona barcode continuamente', '#3b82f6')}
            {btnModalita('conti', '🍽️', 'Gestione Conti', 'Tavoli e conti aperti', '#22c55e')}
            {btnModalita('ingrosso', '🏭', 'Cassa Ingrosso', 'Vendita B2B con listini', '#8b5cf6')}
            {btnModalita('archivio', '📋', 'Archivio Documenti', 'Storico vendite e fatture', '#64748b')}
            {btnModalita('chiusura', '🔒', 'Chiusura Cassa', 'Riepilogo e chiusura giornata', '#ef4444')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Vendite Oggi', value: kpiVendite.oggi, color: '#3b82f6' },
              { label: 'Incasso Oggi', value: '€' + kpiVendite.totaleOggi.toFixed(2), color: '#22c55e' },
              { label: 'Contanti', value: '€' + kpiVendite.contanti.toFixed(2), color: '#f59e0b' },
              { label: 'Carta', value: '€' + kpiVendite.carta.toFixed(2), color: '#8b5cf6' },
            ].map(k => (
              <div key={k.label} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${k.color}` }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: k.color }}>{k.value}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCAN & GO */}
      {modalita === 'scan' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>← Indietro</button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>📷 Scan & Go</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
            <div>
              <div style={{ background: scanFeedback === 'ok' ? '#dcfce7' : scanFeedback === 'error' ? '#fee2e2' : 'white', borderRadius: '16px', padding: '24px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: `3px solid ${scanFeedback === 'ok' ? '#22c55e' : scanFeedback === 'error' ? '#ef4444' : '#e2e8f0'}`, transition: 'all 0.3s' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>SCANSIONA O DIGITA BARCODE / CODICE</div>
                <input ref={barcodeRef} value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={scanBarcode}
                  autoFocus placeholder="Punta il lettore barcode qui..." autoComplete="off"
                  style={{ width: '100%', border: '2px solid #3b82f6', borderRadius: '10px', padding: '16px', fontSize: '20px', outline: 'none', boxSizing: 'border-box', fontWeight: '600', letterSpacing: '2px' }} />
                {ultimoScan && (
                  <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: '700', color: scanFeedback === 'error' ? '#ef4444' : '#22c55e' }}>
                    {scanFeedback === 'ok' ? '✅ ' : '❌ '}{ultimoScan}
                  </div>
                )}
              </div>
              <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: '700' }}>Articoli aggiunti ({carrello.length} righe)</h3>
                {carrello.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '40px' }}>📦</div>
                    <p>Scansiona il primo articolo</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                    {[...carrello].reverse().map((r, i) => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i === 0 ? '#eff6ff' : '#f8fafc', borderRadius: '8px', border: i === 0 ? '2px solid #3b82f6' : '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '15px' }}>{r.nome}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{r.codice} • €{r.prezzo.toFixed(2)}/pz</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button onClick={() => aggiornaQta(r.id, r.qta - 1)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '800' }}>-</button>
                          <span style={{ fontWeight: '800', fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>{r.qta}</span>
                          <button onClick={() => aggiornaQta(r.id, r.qta + 1)} style={{ background: '#dcfce7', color: '#22c55e', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '800' }}>+</button>
                          <span style={{ fontWeight: '800', color: '#0f172a', minWidth: '60px', textAlign: 'right' }}>€{r.totale.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Totale fisso */}
            <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '800' }}>Totale</h3>
                <div style={{ fontSize: '42px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>€{totale.toFixed(2)}</div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>{carrello.reduce((s, r) => s + r.qta, 0)} articoli</div>
                <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                  {['contanti', 'carta', 'bonifico'].map(p => (
                    <button key={p} onClick={() => setPagamento(p)}
                      style={{ padding: '12px', border: `2px solid ${pagamento === p ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', background: pagamento === p ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: pagamento === p ? '#3b82f6' : '#374151' }}>
                      {p === 'contanti' ? '💵 Contanti' : p === 'carta' ? '💳 Carta' : '🏦 Bonifico'}
                    </button>
                  ))}
                </div>
                {pagamento === 'contanti' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Contanti dati</label>
                    <input type="number" value={contantiDati || ''} onChange={e => setContantiDati(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '18px', fontWeight: '700', marginTop: '4px', outline: 'none', boxSizing: 'border-box' }} />
                    {contantiDati >= totale && <div style={{ marginTop: '8px', fontSize: '18px', fontWeight: '800', color: '#22c55e' }}>Resto: €{(contantiDati - totale).toFixed(2)}</div>}
                  </div>
                )}
                <button onClick={() => completaVendita('scontrino')} disabled={loading || carrello.length === 0}
                  style={{ width: '100%', background: carrello.length === 0 ? '#94a3b8' : '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '16px', fontWeight: '800', cursor: 'pointer', fontSize: '18px' }}>
                  {loading ? '⏳...' : '✅ PAGA €' + totale.toFixed(2)}
                </button>
                <button onClick={() => setCarrello([])} style={{ width: '100%', marginTop: '8px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '600', cursor: 'pointer' }}>🗑️ Svuota</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASSA VELOCE */}
      {modalita === 'veloce' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>← Indietro</button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>⚡ Cassa Veloce</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
            <div>
              <input placeholder="🔍 Cerca articolo per nome o codice..." value={cerca} onChange={e => setCerca(e.target.value)}
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', fontSize: '15px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {artFiltrati.map(a => (
                  <button key={a.id} onClick={() => aggiungiAlCarrello(a)}
                    style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{a.codice}</div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', marginBottom: '8px', lineHeight: '1.3' }}>{a.nome}</div>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: '#3b82f6' }}>€{a.prezzo_base?.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: a.stock <= a.stock_minimo && a.stock_minimo > 0 ? '#ef4444' : '#94a3b8', marginTop: '4px' }}>Stock: {a.stock} {a.um}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 12px', fontWeight: '800' }}>Carrello</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
                  {carrello.length === 0 ? <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>Clicca sugli articoli per aggiungerli</div> : carrello.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{r.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>€{r.prezzo.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => aggiornaQta(r.id, r.qta - 1)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}>-</button>
                        <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{r.qta}</span>
                        <button onClick={() => aggiornaQta(r.id, r.qta + 1)} style={{ background: '#dcfce7', color: '#22c55e', border: 'none', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer', fontWeight: '800', fontSize: '14px' }}>+</button>
                        <span style={{ fontWeight: '700', minWidth: '55px', textAlign: 'right', fontSize: '13px' }}>€{r.totale.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                    <span>Subtotale</span><span>€{subtotale.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b' }}>Sconto %</span>
                    <input type="number" min="0" max="100" value={scontoTotale} onChange={e => setScontoTotale(Number(e.target.value))}
                      style={{ width: '60px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', fontSize: '14px', outline: 'none' }} />
                    <span style={{ fontSize: '14px', color: '#ef4444' }}>-€{scontoImporto.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '20px' }}>
                    <span>TOTALE</span><span style={{ color: '#3b82f6' }}>€{totale.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                  {['contanti', 'carta', 'bonifico'].map(p => (
                    <button key={p} onClick={() => setPagamento(p)}
                      style={{ padding: '8px 4px', border: `2px solid ${pagamento === p ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', background: pagamento === p ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: pagamento === p ? '#3b82f6' : '#374151' }}>
                      {p === 'contanti' ? '💵' : p === 'carta' ? '💳' : '🏦'} {p}
                    </button>
                  ))}
                </div>
                {pagamento === 'contanti' && (
                  <div style={{ marginBottom: '12px' }}>
                    <input type="number" placeholder="Contanti dati..." value={contantiDati || ''} onChange={e => setContantiDati(Number(e.target.value))}
                      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', fontSize: '16px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }} />
                    {contantiDati >= totale && totale > 0 && <div style={{ marginTop: '6px', fontWeight: '800', color: '#22c55e' }}>Resto: €{(contantiDati - totale).toFixed(2)}</div>}
                  </div>
                )}
                <div style={{ display: 'grid', gap: '6px' }}>
                  <button onClick={() => completaVendita('scontrino')} disabled={loading || carrello.length === 0}
                    style={{ background: carrello.length === 0 ? '#94a3b8' : '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '15px' }}>
                    🧾 Scontrino €{totale.toFixed(2)}
                  </button>
                  <button onClick={() => completaVendita('fattura')} disabled={loading || carrello.length === 0}
                    style={{ background: carrello.length === 0 ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                    📄 Emetti Fattura
                  </button>
                  <button onClick={() => setCarrello([])} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '600', cursor: 'pointer' }}>🗑️ Svuota Carrello</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GESTIONE CONTI */}
      {modalita === 'conti' && !contoAttivo && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>← Indietro</button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>🍽️ Gestione Conti</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {conti.map(c => (
              <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', border: '2px solid #e2e8f0' }}
                onClick={() => setContoAttivo(c.id)}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.tipo === 'tavolo' ? '🍽️' : c.tipo === 'ingrosso' ? '🏭' : c.tipo === 'scan' ? '📷' : '👤'}</div>
                <div style={{ fontWeight: '800', fontSize: '16px', marginBottom: '4px' }}>{c.nome}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{c.righe.length} articoli</div>
                <div style={{ fontWeight: '700', color: '#22c55e', marginTop: '8px' }}>€{c.righe.reduce((s, r) => s + r.totale, 0).toFixed(2)}</div>
              </div>
            ))}
            {['Tavolo', 'Cliente', 'Ingrosso', 'Scan'].map(tipo => (
              <button key={tipo} onClick={() => { const nome = prompt(`Nome ${tipo}:`); if (nome) apriNuovoConto(nome, tipo.toLowerCase()) }}
                style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', cursor: 'pointer', color: '#64748b', fontWeight: '600' }}>
                + Nuovo {tipo}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONTO ATTIVO */}
      {modalita === 'conti' && contoAttivo && contoAttivoData && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setContoAttivo(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>← Conti</button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>{contoAttivoData.nome}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
            <div>
              <input placeholder="🔍 Cerca articolo..." value={cerca} onChange={e => setCerca(e.target.value)}
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', fontSize: '15px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
                {artFiltrati.map(a => (
                  <button key={a.id} onClick={() => aggiungiARigaConto(contoAttivo, a)}
                    style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '14px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '6px' }}>{a.nome}</div>
                    <div style={{ fontWeight: '800', color: '#22c55e' }}>€{a.prezzo_base?.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 12px', fontWeight: '800' }}>Conto: {contoAttivoData.nome}</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '12px' }}>
                  {contoAttivoData.righe.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>Nessun articolo</div> : contoAttivoData.righe.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{r.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>x{r.qta} • €{r.prezzo.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: '700', fontSize: '13px' }}>€{r.totale.toFixed(2)}</span>
                        <button onClick={() => eliminaRigaConto(r.id)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '20px' }}>
                    <span>TOTALE</span>
                    <span style={{ color: '#22c55e' }}>€{contoAttivoData.righe.reduce((s, r) => s + r.totale, 0).toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => chiudiConto(contoAttivo)}
                  style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '16px' }}>
                  💳 Chiudi e Paga
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASSA INGROSSO */}
      {modalita === 'ingrosso' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>← Indietro</button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>🏭 Cassa Ingrosso</h2>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <label style={{ fontSize: '13px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '8px' }}>Seleziona Cliente</label>
            <select value={clienteSelezionato?.id || ''} onChange={e => setClienteSelezionato(clienti.find(c => c.id === e.target.value) || null)}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '14px', outline: 'none' }}>
              <option value="">-- Seleziona cliente --</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome} — Listino: {c.listino} — Sconto: {c.sconto}%</option>)}
            </select>
            {clienteSelezionato && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '13px', flexWrap: 'wrap' }}>
                <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}>Listino: {clienteSelezionato.listino}</span>
                <span style={{ background: '#f0fdf4', color: '#22c55e', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}>Sconto: {clienteSelezionato.sconto}%</span>
                {clienteSelezionato.fido > 0 && <span style={{ background: '#fefce8', color: '#ca8a04', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}>Fido: €{clienteSelezionato.fido}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
            <div>
              <input placeholder="🔍 Cerca articolo..." value={cerca} onChange={e => setCerca(e.target.value)}
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', fontSize: '15px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
              <div style={{ display: 'grid', gap: '8px', maxHeight: '450px', overflowY: 'auto' }}>
                {artFiltrati.map(a => {
                  const prezzo = clienteSelezionato ? (clienteSelezionato.listino === 'premium' ? a.prezzo_premium : clienteSelezionato.listino === 'rivenditori' ? a.prezzo_rivenditori : a.prezzo_base) : a.prezzo_base
                  return (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <div>
                        <div style={{ fontWeight: '700' }}>{a.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{a.codice} {a.ean ? `• EAN: ${a.ean}` : ''} • Stock: {a.stock}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: '800', color: '#8b5cf6', fontSize: '18px' }}>€{prezzo?.toFixed(2)}</span>
                        <button onClick={() => aggiungiAlCarrello(a)} style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '700' }}>+ Aggiungi</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 12px', fontWeight: '800' }}>Ordine</h3>
                <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '12px' }}>
                  {carrello.length === 0 ? <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '14px' }}>Nessun articolo</div> : carrello.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px' }}>{r.nome}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>x{r.qta} • €{r.prezzo.toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button onClick={() => aggiornaQta(r.id, r.qta - 1)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', fontWeight: '800' }}>-</button>
                        <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center', fontSize: '13px' }}>{r.qta}</span>
                        <button onClick={() => aggiornaQta(r.id, r.qta + 1)} style={{ background: '#dcfce7', color: '#22c55e', border: 'none', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', fontWeight: '800' }}>+</button>
                        <span style={{ fontWeight: '700', minWidth: '55px', textAlign: 'right', fontSize: '13px' }}>€{r.totale.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '20px' }}>
                    <span>TOTALE</span><span style={{ color: '#8b5cf6' }}>€{totale.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <button onClick={() => completaVendita('fattura')} disabled={loading || carrello.length === 0}
                    style={{ background: carrello.length === 0 ? '#94a3b8' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '800', cursor: 'pointer' }}>📄 Emetti Fattura</button>
                  <button onClick={() => completaVendita('ddt')} disabled={loading || carrello.length === 0}
                    style={{ background: carrello.length === 0 ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '700', cursor: 'pointer' }}>🚚 Emetti DDT</button>
                  <button onClick={() => completaVendita('preventivo')} disabled={loading || carrello.length === 0}
                    style={{ background: carrello.length === 0 ? '#94a3b8' : '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '700', cursor: 'pointer' }}>📋 Crea Preventivo</button>
                  <button onClick={() => setCarrello([])} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: '600', cursor: 'pointer' }}>🗑️ Svuota</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVIO */}
      {modalita === 'archivio' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>← Indietro</button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>📋 Archivio Documenti</h2>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {vendite.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: 'white', borderRadius: '12px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                <p>Nessun documento ancora</p>
              </div>
            ) : vendite.map(v => (
              <div key={v.id} style={{ background: 'white', borderRadius: '10px', padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px' }}>{v.numero}</span>
                    <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>{v.tipo}</span>
                    <span style={{ background: v.stato === 'pagata' ? '#dcfce7' : '#fef9c3', color: v.stato === 'pagata' ? '#166534' : '#854d0e', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>{v.stato}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    {v.data} {v.cliente_nome ? `• ${v.cliente_nome}` : ''} • {v.pagamento}
                  </div>
                </div>
                <div style={{ fontWeight: '800', fontSize: '18px', color: '#22c55e' }}>€{v.totale?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHIUSURA CASSA */}
      {modalita === 'chiusura' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setModalita('home')} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: '600' }}>← Indietro</button>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>🔒 Chiusura Cassa</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Vendite Oggi', value: kpiVendite.oggi, color: '#3b82f6', icon: '🧾' },
              { label: 'Totale Giornata', value: '€' + kpiVendite.totaleOggi.toFixed(2), color: '#22c55e', icon: '💰' },
              { label: 'Incasso Contanti', value: '€' + kpiVendite.contanti.toFixed(2), color: '#f59e0b', icon: '💵' },
              { label: 'Incasso Carta', value: '€' + kpiVendite.carta.toFixed(2), color: '#8b5cf6', icon: '💳' },
            ].map(k => (
              <div key={k.label} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${k.color}` }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{k.icon}</div>
                <div style={{ fontSize: '26px', fontWeight: '900', color: k.color }}>{k.value}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{k.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: '800' }}>Ultime vendite di oggi</h3>
            {vendite.filter(v => v.data === new Date().toISOString().split('T')[0]).map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' }}>
                <span style={{ fontWeight: '600' }}>{v.numero}</span>
                <span style={{ color: '#64748b' }}>{v.tipo} • {v.pagamento}</span>
                <span style={{ fontWeight: '700', color: '#22c55e' }}>€{v.totale?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal pagamento da conto */}
      {showPaga && carrello.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 16px', fontWeight: '800' }}>Chiudi Conto</h2>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#22c55e', marginBottom: '16px' }}>€{totale.toFixed(2)}</div>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
              {['contanti', 'carta', 'bonifico'].map(p => (
                <button key={p} onClick={() => setPagamento(p)}
                  style={{ padding: '12px', border: `2px solid ${pagamento === p ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', background: pagamento === p ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: '600' }}>
                  {p === 'contanti' ? '💵 Contanti' : p === 'carta' ? '💳 Carta' : '🏦 Bonifico'}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              <button onClick={() => completaVendita('scontrino')} disabled={loading}
                style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '16px' }}>
                🧾 Emetti Scontrino
              </button>
              <button onClick={() => completaVendita('fattura')} disabled={loading}
                style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer' }}>
                📄 Emetti Fattura
              </button>
              <button onClick={() => setShowPaga(false)} style={{ background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '600', cursor: 'pointer' }}>Annulla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
