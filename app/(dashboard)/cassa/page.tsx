'use client'
import { useState } from 'react'

// ===== TIPI =====
type Articolo = { id: number; codice: string; ean: string; nome: string; categoria: string; prezzo: number; iva: number; stock: number }
type RigaCarrello = { id: number; articolo: Articolo; qta: number; prezzo_unitario: number; sconto: number }
type Conto = { id: number; nome: string; tipo: 'tavolo' | 'cliente' | 'ingrosso'; cliente_id?: number; righe: RigaCarrello[]; aperto: boolean; creato: string }
type Documento = { id: number; tipo: string; numero: string; data: string; cliente: string; totale: number; pagamento: string; righe: RigaCarrello[] }
type Cliente = { id: number; nome: string; listino: string; sconto: number; fido: number; saldo_aperto: number }

// ===== DATI DEMO =====
const articoliDemo: Articolo[] = [
  { id: 1, codice: 'ART-001', ean: '8001234567890', nome: 'T-Shirt Cotone', categoria: 'Abbigliamento', prezzo: 18.70, iva: 22, stock: 145 },
  { id: 2, codice: 'ART-002', ean: '8009876543210', nome: 'Scarpa Running', categoria: 'Calzature', prezzo: 90.00, iva: 22, stock: 38 },
  { id: 3, codice: 'ART-003', ean: '8001111111111', nome: 'Felpa Zip', categoria: 'Abbigliamento', prezzo: 45.00, iva: 22, stock: 60 },
  { id: 4, codice: 'ART-004', ean: '8002222222222', nome: 'Pantaloni Jeans', categoria: 'Abbigliamento', prezzo: 65.00, iva: 22, stock: 80 },
  { id: 5, codice: 'ART-005', ean: '8003333333333', nome: 'Cappello Invernale', categoria: 'Accessori', prezzo: 22.00, iva: 22, stock: 120 },
  { id: 6, codice: 'ART-006', ean: '8004444444444', nome: 'Borsa Tracolla', categoria: 'Accessori', prezzo: 55.00, iva: 22, stock: 45 },
  { id: 7, codice: 'SRV-001', ean: '', nome: 'Consulenza Oraria', categoria: 'Servizi', prezzo: 85.00, iva: 22, stock: 999 },
  { id: 8, codice: 'ART-007', ean: '8005555555555', nome: 'Cintura Pelle', categoria: 'Accessori', prezzo: 35.00, iva: 22, stock: 70 },
]

const clientiDemo: Cliente[] = [
  { id: 1, nome: 'Rossi Group SRL', listino: 'premium', sconto: 10, fido: 10000, saldo_aperto: 3200 },
  { id: 2, nome: 'Bianchi SPA', listino: 'rivenditori', sconto: 15, fido: 5000, saldo_aperto: 0 },
  { id: 3, nome: 'Mario Verdi', listino: 'base', sconto: 0, fido: 0, saldo_aperto: 0 },
]

const categorie = ['Tutti', ...Array.from(new Set(articoliDemo.map(a => a.categoria)))]

let docCounter = 1001

export default function CassaPage() {
  const [modalita, setModalita] = useState<'scelta' | 'veloce' | 'conti' | 'ingrosso' | 'documenti' | 'chiusura'>('scelta')
  const [articoli] = useState<Articolo[]>(articoliDemo)
  const [clienti] = useState<Cliente[]>(clientiDemo)

  // Cassa Veloce
  const [carrello, setCarrello] = useState<RigaCarrello[]>([])
  const [cercaArt, setCercaArt] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Tutti')
  const [scontoTotale, setScontoTotale] = useState(0)
  const [pagamento, setPagamento] = useState('contanti')
  const [contantiDati, setContantiDati] = useState(0)
  const [mostraPagamento, setMostraPagamento] = useState(false)
  const [mostraScontrino, setMostraScontrino] = useState<Documento | null>(null)

  // Conti
  const [conti, setConti] = useState<Conto[]>([
    { id: 1, nome: 'Tavolo 1', tipo: 'tavolo', righe: [], aperto: true, creato: '21:00' },
    { id: 2, nome: 'Tavolo 3', tipo: 'tavolo', righe: [
      { id: 1, articolo: articoliDemo[0], qta: 2, prezzo_unitario: 18.70, sconto: 0 },
      { id: 2, articolo: articoliDemo[4], qta: 1, prezzo_unitario: 22.00, sconto: 0 },
    ], aperto: true, creato: '20:30' },
  ])
  const [contoAttivo, setContoAttivo] = useState<Conto | null>(null)
  const [nuovoConto, setNuovoConto] = useState(false)
  const [nomeNuovoConto, setNomeNuovoConto] = useState('')
  const [tipoNuovoConto, setTipoNuovoConto] = useState<'tavolo' | 'cliente' | 'ingrosso'>('tavolo')

  // Ingrosso
  const [clienteSelezionato, setClienteSelezionato] = useState<Cliente | null>(null)
  const [carrelloIngrosso, setCarrelloIngrosso] = useState<RigaCarrello[]>([])
  const [cercaIngrosso, setCercaIngrosso] = useState('')
  const [mostraPagamentoIngrosso, setMostraPagamentoIngrosso] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState('fattura')

  // Documenti
  const [documenti, setDocumenti] = useState<Documento[]>([
    { id: 1, tipo: 'Scontrino', numero: 'SCO-1001', data: '2026-04-19', cliente: 'Cliente generico', totale: 59.40, pagamento: 'contanti', righe: [] },
    { id: 2, tipo: 'Fattura', numero: 'FAT-0001', data: '2026-04-18', cliente: 'Rossi Group SRL', totale: 1250.00, pagamento: 'bonifico', righe: [] },
    { id: 3, tipo: 'Ricevuta', numero: 'RIC-0001', data: '2026-04-17', cliente: 'Mario Verdi', totale: 85.00, pagamento: 'carta', righe: [] },
  ])

  // Helpers
  const totaleCarrello = (righe: RigaCarrello[], sconto = 0) => {
    const sub = righe.reduce((s, r) => s + r.prezzo_unitario * r.qta * (1 - r.sconto / 100), 0)
    return sub * (1 - sconto / 100)
  }

  const aggiungiAlCarrello = (art: Articolo, righe: RigaCarrello[], setRighe: (r: RigaCarrello[]) => void) => {
    const esistente = righe.find(r => r.articolo.id === art.id)
    if (esistente) {
      setRighe(righe.map(r => r.articolo.id === art.id ? { ...r, qta: r.qta + 1 } : r))
    } else {
      setRighe([...righe, { id: Date.now(), articolo: art, qta: 1, prezzo_unitario: art.prezzo, sconto: 0 }])
    }
  }

  const rimuoviDaCarrello = (id: number, righe: RigaCarrello[], setRighe: (r: RigaCarrello[]) => void) => {
    setRighe(righe.filter(r => r.id !== id))
  }

  const cambiaQta = (id: number, delta: number, righe: RigaCarrello[], setRighe: (r: RigaCarrello[]) => void) => {
    setRighe(righe.map(r => r.id === id ? { ...r, qta: Math.max(1, r.qta + delta) } : r))
  }

  const cercaBarcode = (ean: string, righe: RigaCarrello[], setRighe: (r: RigaCarrello[]) => void) => {
    const art = articoli.find(a => a.ean === ean)
    if (art) { aggiungiAlCarrello(art, righe, setRighe); return true }
    return false
  }

  const completaVendita = (righe: RigaCarrello[], sconto: number, pag: string, tipo: string, cliente: string) => {
    const doc: Documento = {
      id: Date.now(), tipo, numero: `${tipo.substring(0, 3).toUpperCase()}-${docCounter++}`,
      data: new Date().toISOString().split('T')[0], cliente, totale: totaleCarrello(righe, sconto), pagamento: pag, righe: [...righe]
    }
    setDocumenti(prev => [doc, ...prev])
    return doc
  }

  const s: Record<string, React.CSSProperties> = {
    page: { padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif', paddingBottom: '80px' },
    card: { background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9', marginBottom: '12px' },
    btn: { border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' },
    inp: { width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' as const },
    lbl: { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#374151' },
  }

  const artFiltrati = articoli.filter(a => {
    const q = cercaArt.toLowerCase()
    return (a.nome.toLowerCase().includes(q) || a.codice.toLowerCase().includes(q) || a.ean.includes(q)) &&
      (filtroCategoria === 'Tutti' || a.categoria === filtroCategoria)
  })

  // ===== SCHERMATA SCELTA MODALITA =====
  if (modalita === 'scelta') return (
    <div style={s.page}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Cassa</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>Scegli la modalita di cassa</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {[
          { id: 'veloce', icon: '\u26a1', title: 'Cassa Veloce', desc: 'Retail e negozi al dettaglio — griglia articoli, barcode, scontrino rapido', color: '#3b82f6', bg: '#eff6ff' },
          { id: 'conti', icon: '\ud83d\udcdd', title: 'Gestione Conti', desc: 'Bar, ristoranti, tavoli — apri conti, aggiungi articoli, chiudi quando vuoi', color: '#f59e0b', bg: '#fffbeb' },
          { id: 'ingrosso', icon: '\ud83c\udfed', title: 'Cassa Ingrosso / B2B', desc: 'Grossisti e clienti business — listini, sconti, fattura o DDT immediata', color: '#8b5cf6', bg: '#f5f3ff' },
          { id: 'documenti', icon: '\ud83d\udcc4', title: 'Archivio Documenti', desc: 'Scontrini, fatture, ricevute, note credito — storico completo', color: '#22c55e', bg: '#f0fdf4' },
          { id: 'chiusura', icon: '\ud83d\udcca', title: 'Chiusura Cassa', desc: 'Riepilogo giornaliero, incassi per metodo pagamento, stampa Z', color: '#ef4444', bg: '#fef2f2' },
        ].map(m => (
          <button key={m.id} onClick={() => setModalita(m.id as typeof modalita)}
            style={{ background: m.bg, border: `2px solid ${m.color}33`, borderRadius: '14px', padding: '18px', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '32px' }}>{m.icon}</span>
              <div>
                <p style={{ fontWeight: '700', fontSize: '16px', color: m.color, margin: '0 0 4px' }}>{m.title}</p>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{m.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ===== CASSA VELOCE =====
  if (modalita === 'veloce') return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => { setModalita('scelta'); setCarrello([]); setMostraPagamento(false) }} style={{ ...s.btn, background: '#f1f5f9', color: '#374151', padding: '8px 12px' }}>Indietro</button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Cassa Veloce</h1>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Retail — click rapido o barcode</p>
        </div>
      </div>

      {!mostraPagamento ? (
        <>
          <input value={cercaArt} onChange={e => {
            setCercaArt(e.target.value)
            if (e.target.value.length >= 8) { cercaBarcode(e.target.value, carrello, setCarrello); setTimeout(() => setCercaArt(''), 500) }
          }} placeholder="Cerca articolo o scansiona barcode EAN..." style={{ ...s.inp, marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
            {categorie.map(c => (
              <button key={c} onClick={() => setFiltroCategoria(c)}
                style={{ ...s.btn, whiteSpace: 'nowrap', padding: '6px 14px', background: filtroCategoria === c ? '#3b82f6' : '#f1f5f9', color: filtroCategoria === c ? 'white' : '#374151', fontSize: '12px' }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {artFiltrati.map(a => (
              <button key={a.id} onClick={() => aggiungiAlCarrello(a, carrello, setCarrello)}
                style={{ background: 'white', border: '2px solid #e2e8f0', borderRadius: '12px', padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <p style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', margin: '0 0 4px' }}>{a.nome}</p>
                <p style={{ color: '#64748b', fontSize: '11px', margin: '0 0 6px' }}>{a.codice}</p>
                <p style={{ color: '#3b82f6', fontSize: '16px', fontWeight: '700', margin: 0 }}>{`\u20ac${a.prezzo.toFixed(2)}`}</p>
                <p style={{ color: a.stock < 5 ? '#ef4444' : '#94a3b8', fontSize: '11px', margin: '4px 0 0' }}>Stock: {a.stock}</p>
              </button>
            ))}
          </div>

          {carrello.length > 0 && (
            <div style={s.card}>
              <h3 style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 12px' }}>Carrello ({carrello.length} articoli)</h3>
              {carrello.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{r.articolo.nome}</p>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{`\u20ac${r.prezzo_unitario.toFixed(2)} cad.`}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => cambiaQta(r.id, -1, carrello, setCarrello)} style={{ ...s.btn, padding: '4px 10px', background: '#f1f5f9', color: '#374151', fontSize: '16px' }}>-</button>
                    <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{r.qta}</span>
                    <button onClick={() => cambiaQta(r.id, 1, carrello, setCarrello)} style={{ ...s.btn, padding: '4px 10px', background: '#f1f5f9', color: '#374151', fontSize: '16px' }}>+</button>
                    <span style={{ fontWeight: '700', color: '#0f172a', minWidth: '60px', textAlign: 'right' }}>{`\u20ac${(r.prezzo_unitario * r.qta).toFixed(2)}`}</span>
                    <button onClick={() => rimuoviDaCarrello(r.id, carrello, setCarrello)} style={{ ...s.btn, padding: '4px 8px', background: '#fee2e2', color: '#991b1b', fontSize: '12px' }}>x</button>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={s.lbl}>Sconto totale (%)</label>
                  <input type="number" min="0" max="100" value={scontoTotale || ''} onChange={e => setScontoTotale(parseFloat(e.target.value) || 0)}
                    style={{ ...s.inp, width: '80px', textAlign: 'right' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '2px solid #0f172a' }}>
                  <span style={{ fontWeight: '700', fontSize: '18px' }}>TOTALE</span>
                  <span style={{ fontWeight: '700', fontSize: '22px', color: '#3b82f6' }}>{`\u20ac${totaleCarrello(carrello, scontoTotale).toFixed(2)}`}</span>
                </div>
                <button onClick={() => setMostraPagamento(true)}
                  style={{ ...s.btn, width: '100%', background: '#22c55e', color: 'white', fontSize: '16px', padding: '14px' }}>
                  Procedi al Pagamento
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={s.card}>
          <h3 style={{ fontWeight: '700', fontSize: '16px', margin: '0 0 16px' }}>Pagamento</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
            {['contanti', 'carta', 'bonifico', 'misto'].map(p => (
              <button key={p} onClick={() => setPagamento(p)}
                style={{ ...s.btn, flex: 1, background: pagamento === p ? '#0f172a' : '#f1f5f9', color: pagamento === p ? 'white' : '#374151', textTransform: 'capitalize' as const }}>
                {p === 'contanti' ? 'Contanti' : p === 'carta' ? 'Carta' : p === 'bonifico' ? 'Bonifico' : 'Misto'}
              </button>
            ))}
          </div>
          {pagamento === 'contanti' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={s.lbl}>Contanti ricevuti (euro)</label>
              <input type="number" min="0" step="0.01" value={contantiDati || ''} onChange={e => setContantiDati(parseFloat(e.target.value) || 0)}
                style={s.inp} />
              {contantiDati > 0 && (
                <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600', color: '#166534' }}>Resto:</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#166534' }}>{`\u20ac${Math.max(0, contantiDati - totaleCarrello(carrello, scontoTotale)).toFixed(2)}`}</span>
                </div>
              )}
            </div>
          )}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '14px' }}>Subtotale:</span>
              <span style={{ fontWeight: '600' }}>{`\u20ac${totaleCarrello(carrello, 0).toFixed(2)}`}</span>
            </div>
            {scontoTotale > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Sconto {scontoTotale}%:</span>
                <span style={{ fontWeight: '600', color: '#ef4444' }}>{`-\u20ac${(totaleCarrello(carrello, 0) - totaleCarrello(carrello, scontoTotale)).toFixed(2)}`}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f172a', paddingTop: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '16px' }}>TOTALE:</span>
              <span style={{ fontWeight: '700', fontSize: '20px', color: '#3b82f6' }}>{`\u20ac${totaleCarrello(carrello, scontoTotale).toFixed(2)}`}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => {
              const doc = completaVendita(carrello, scontoTotale, pagamento, 'Scontrino', 'Cliente generico')
              setMostraScontrino(doc); setCarrello([]); setScontoTotale(0); setMostraPagamento(false)
            }} style={{ ...s.btn, flex: 1, background: '#3b82f6', color: 'white', fontSize: '14px' }}>Emetti Scontrino</button>
            <button onClick={() => {
              const doc = completaVendita(carrello, scontoTotale, pagamento, 'Ricevuta', 'Cliente generico')
              setMostraScontrino(doc); setCarrello([]); setScontoTotale(0); setMostraPagamento(false)
            }} style={{ ...s.btn, flex: 1, background: '#8b5cf6', color: 'white', fontSize: '14px' }}>Emetti Ricevuta</button>
          </div>
          <button onClick={() => setMostraPagamento(false)} style={{ ...s.btn, width: '100%', background: '#f1f5f9', color: '#374151' }}>Indietro</button>
        </div>
      )}

      {mostraScontrino && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '28px', margin: '0 0 8px' }}>✅</p>
              <h2 style={{ fontWeight: '700', fontSize: '18px', margin: '0 0 4px' }}>Vendita Completata!</h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{mostraScontrino.numero} — {mostraScontrino.data}</p>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontFamily: 'monospace', fontSize: '13px' }}>
              <p style={{ textAlign: 'center', fontWeight: '700', margin: '0 0 8px' }}>LA TUA AZIENDA SRL</p>
              <p style={{ textAlign: 'center', color: '#64748b', margin: '0 0 12px', fontSize: '11px' }}>Via Roma 1 — P.IVA IT12345678901</p>
              <div style={{ borderTop: '1px dashed #94a3b8', borderBottom: '1px dashed #94a3b8', padding: '8px 0', margin: '8px 0' }}>
                {mostraScontrino.righe.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{r.qta}x {r.articolo.nome}</span>
                    <span>{`\u20ac${(r.prezzo_unitario * r.qta).toFixed(2)}`}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '15px', marginTop: '8px' }}>
                <span>TOTALE</span>
                <span>{`\u20ac${mostraScontrino.totale.toFixed(2)}`}</span>
              </div>
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', margin: '12px 0 0' }}>Pagamento: {mostraScontrino.pagamento}</p>
              <p style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', margin: '4px 0 0' }}>Grazie per il tuo acquisto!</p>
            </div>
            <button onClick={() => setMostraScontrino(null)} style={{ ...s.btn, width: '100%', background: '#3b82f6', color: 'white' }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )

  // ===== GESTIONE CONTI =====
  if (modalita === 'conti') return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => { setModalita('scelta'); setContoAttivo(null) }} style={{ ...s.btn, background: '#f1f5f9', color: '#374151', padding: '8px 12px' }}>Indietro</button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Gestione Conti</h1>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{conti.filter(c => c.aperto).length} conti aperti</p>
        </div>
        <button onClick={() => setNuovoConto(true)} style={{ ...s.btn, background: '#f59e0b', color: 'white', marginLeft: 'auto', padding: '8px 14px' }}>+ Nuovo</button>
      </div>

      {!contoAttivo ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {conti.filter(c => c.aperto).map(c => (
              <button key={c.id} onClick={() => setContoAttivo(c)}
                style={{ ...s.card, textAlign: 'left', cursor: 'pointer', marginBottom: 0, border: '2px solid #fef9c3' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a', margin: '0 0 4px' }}>{c.nome}</p>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Aperto alle {c.creato} — {c.righe.length} articoli</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '700', fontSize: '18px', color: '#f59e0b', margin: 0 }}>{`\u20ac${totaleCarrello(c.righe).toFixed(2)}`}</p>
                    <span style={{ background: '#fef9c3', color: '#92400e', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }}>Aperto</span>
                  </div>
                </div>
              </button>
            ))}
            {conti.filter(c => !c.aperto).length > 0 && (
              <>
                <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', margin: '8px 0 4px' }}>CONTI CHIUSI OGGI</p>
                {conti.filter(c => !c.aperto).map(c => (
                  <div key={c.id} style={{ ...s.card, marginBottom: 0, opacity: 0.6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ fontWeight: '600', margin: 0 }}>{c.nome}</p>
                      <p style={{ fontWeight: '700', color: '#22c55e', margin: 0 }}>{`\u20ac${totaleCarrello(c.righe).toFixed(2)}`}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={() => setContoAttivo(null)} style={{ ...s.btn, background: '#f1f5f9', color: '#374151', padding: '8px 12px' }}>Lista conti</button>
            <h2 style={{ fontWeight: '700', fontSize: '18px', margin: 0 }}>{contoAttivo.nome}</h2>
            <button onClick={() => {
              const doc = completaVendita(contoAttivo.righe, 0, 'contanti', 'Scontrino', contoAttivo.nome)
              setConti(prev => prev.map(c => c.id === contoAttivo.id ? { ...c, aperto: false } : c))
              setContoAttivo(null)
              setMostraScontrino(doc)
            }} style={{ ...s.btn, background: '#22c55e', color: 'white', padding: '8px 14px' }}>Chiudi</button>
          </div>
          <input value={cercaArt} onChange={e => setCercaArt(e.target.value)} placeholder="Cerca articolo da aggiungere..." style={{ ...s.inp, marginBottom: '10px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {articoli.filter(a => a.nome.toLowerCase().includes(cercaArt.toLowerCase())).slice(0, 6).map(a => (
              <button key={a.id} onClick={() => {
                const nuoveRighe = [...contoAttivo.righe]
                const esistente = nuoveRighe.find(r => r.articolo.id === a.id)
                if (esistente) esistente.qta++
                else nuoveRighe.push({ id: Date.now(), articolo: a, qta: 1, prezzo_unitario: a.prezzo, sconto: 0 })
                const aggiornato = { ...contoAttivo, righe: nuoveRighe }
                setContoAttivo(aggiornato)
                setConti(prev => prev.map(c => c.id === contoAttivo.id ? aggiornato : c))
              }} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', textAlign: 'left', cursor: 'pointer' }}>
                <p style={{ fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{a.nome}</p>
                <p style={{ color: '#f59e0b', fontWeight: '700', margin: 0 }}>{`\u20ac${a.prezzo.toFixed(2)}`}</p>
              </button>
            ))}
          </div>
          {contoAttivo.righe.length > 0 ? (
            <div style={s.card}>
              <h3 style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 12px' }}>Ordine corrente</h3>
              {contoAttivo.righe.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', fontSize: '13px', margin: 0 }}>{r.articolo.nome}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => {
                      const nuoveRighe = contoAttivo.righe.map(x => x.id === r.id ? { ...x, qta: Math.max(1, x.qta - 1) } : x)
                      const aggiornato = { ...contoAttivo, righe: nuoveRighe }
                      setContoAttivo(aggiornato)
                      setConti(prev => prev.map(c => c.id === contoAttivo.id ? aggiornato : c))
                    }} style={{ ...s.btn, padding: '4px 10px', background: '#f1f5f9', color: '#374151' }}>-</button>
                    <span style={{ fontWeight: '700' }}>{r.qta}</span>
                    <button onClick={() => {
                      const nuoveRighe = contoAttivo.righe.map(x => x.id === r.id ? { ...x, qta: x.qta + 1 } : x)
                      const aggiornato = { ...contoAttivo, righe: nuoveRighe }
                      setContoAttivo(aggiornato)
                      setConti(prev => prev.map(c => c.id === contoAttivo.id ? aggiornato : c))
                    }} style={{ ...s.btn, padding: '4px 10px', background: '#f1f5f9', color: '#374151' }}>+</button>
                    <span style={{ fontWeight: '700', minWidth: '60px', textAlign: 'right' }}>{`\u20ac${(r.prezzo_unitario * r.qta).toFixed(2)}`}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '2px solid #0f172a', marginTop: '8px' }}>
                <span style={{ fontWeight: '700', fontSize: '16px' }}>TOTALE</span>
                <span style={{ fontWeight: '700', fontSize: '20px', color: '#f59e0b' }}>{`\u20ac${totaleCarrello(contoAttivo.righe).toFixed(2)}`}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              <p>Nessun articolo nel conto. Cerca e aggiungi articoli sopra.</p>
            </div>
          )}
        </div>
      )}

      {nuovoConto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%' }}>
            <h2 style={{ fontWeight: '700', fontSize: '18px', margin: '0 0 16px' }}>Nuovo Conto</h2>
            <div style={{ marginBottom: '14px' }}>
              <label style={s.lbl}>Nome conto / Tavolo</label>
              <input style={s.inp} placeholder="Es. Tavolo 5 o Mario Rossi" value={nomeNuovoConto} onChange={e => setNomeNuovoConto(e.target.value)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={s.lbl}>Tipo</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['tavolo', 'cliente', 'ingrosso'] as const).map(t => (
                  <button key={t} onClick={() => setTipoNuovoConto(t)}
                    style={{ ...s.btn, flex: 1, background: tipoNuovoConto === t ? '#f59e0b' : '#f1f5f9', color: tipoNuovoConto === t ? 'white' : '#374151', textTransform: 'capitalize' as const }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setNuovoConto(false)} style={{ ...s.btn, flex: 1, background: '#f1f5f9', color: '#374151' }}>Annulla</button>
              <button onClick={() => {
                if (!nomeNuovoConto.trim()) return
                const c: Conto = { id: Date.now(), nome: nomeNuovoConto, tipo: tipoNuovoConto, righe: [], aperto: true, creato: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }
                setConti(prev => [...prev, c])
                setContoAttivo(c)
                setNomeNuovoConto('')
                setNuovoConto(false)
              }} style={{ ...s.btn, flex: 1, background: '#f59e0b', color: 'white' }}>Apri Conto</button>
            </div>
          </div>
        </div>
      )}

      {mostraScontrino && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '360px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '28px', margin: '0 0 8px' }}>✅</p>
              <h2 style={{ fontWeight: '700', fontSize: '18px', margin: '0 0 4px' }}>Conto Chiuso!</h2>
              <p style={{ fontWeight: '700', fontSize: '24px', color: '#22c55e', margin: 0 }}>{`\u20ac${mostraScontrino.totale.toFixed(2)}`}</p>
            </div>
            <button onClick={() => setMostraScontrino(null)} style={{ ...s.btn, width: '100%', background: '#3b82f6', color: 'white' }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )

  // ===== CASSA INGROSSO =====
  if (modalita === 'ingrosso') return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => { setModalita('scelta'); setClienteSelezionato(null); setCarrelloIngrosso([]) }} style={{ ...s.btn, background: '#f1f5f9', color: '#374151', padding: '8px 12px' }}>Indietro</button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Cassa Ingrosso</h1>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>B2B — listini, sconti, fattura immediata</p>
        </div>
      </div>

      {!clienteSelezionato ? (
        <div>
          <p style={{ color: '#374151', fontWeight: '600', marginBottom: '12px' }}>Seleziona cliente:</p>
          {clienti.map(c => (
            <button key={c.id} onClick={() => setClienteSelezionato(c)}
              style={{ ...s.card, textAlign: 'left', cursor: 'pointer', marginBottom: '10px', border: '2px solid #ede9fe', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a', margin: '0 0 4px' }}>{c.nome}</p>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Listino: <strong>{c.listino}</strong> — Sconto: <strong>{c.sconto}%</strong></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: c.saldo_aperto > 0 ? '#ef4444' : '#22c55e', fontSize: '13px', fontWeight: '700', margin: 0 }}>
                    {c.saldo_aperto > 0 ? `Saldo: \u20ac${c.saldo_aperto}` : 'In regola'}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '11px', margin: '2px 0 0' }}>Fido: {`\u20ac${c.fido.toLocaleString('it-IT')}`}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ background: '#f5f3ff', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: '700', color: '#7c3aed', fontSize: '15px', margin: '0 0 2px' }}>{clienteSelezionato.nome}</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>Listino {clienteSelezionato.listino} — Sconto {clienteSelezionato.sconto}%</p>
            </div>
            <button onClick={() => { setClienteSelezionato(null); setCarrelloIngrosso([]) }} style={{ ...s.btn, background: '#ede9fe', color: '#7c3aed', padding: '6px 12px', fontSize: '12px' }}>Cambia</button>
          </div>
          <input value={cercaIngrosso} onChange={e => setCercaIngrosso(e.target.value)} placeholder="Cerca articolo..." style={{ ...s.inp, marginBottom: '12px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {articoli.filter(a => a.nome.toLowerCase().includes(cercaIngrosso.toLowerCase()) || a.codice.toLowerCase().includes(cercaIngrosso.toLowerCase())).map(a => {
              const prezzoCliente = a.prezzo * (1 - clienteSelezionato.sconto / 100)
              return (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '10px', padding: '12px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{a.nome}</p>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{a.codice} — Stock: {a.stock}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#8b5cf6', fontWeight: '700', fontSize: '15px', margin: 0 }}>{`\u20ac${prezzoCliente.toFixed(2)}`}</p>
                      <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, textDecoration: 'line-through' }}>{`\u20ac${a.prezzo.toFixed(2)}`}</p>
                    </div>
                    <button onClick={() => aggiungiAlCarrello({ ...a, prezzo: prezzoCliente }, carrelloIngrosso, setCarrelloIngrosso)}
                      style={{ ...s.btn, background: '#8b5cf6', color: 'white', padding: '8px 14px' }}>+</button>
                  </div>
                </div>
              )
            })}
          </div>

          {carrelloIngrosso.length > 0 && (
            <div style={s.card}>
              <h3 style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 12px' }}>Ordine ({carrelloIngrosso.length} righe)</h3>
              {carrelloIngrosso.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', fontSize: '13px', margin: 0 }}>{r.articolo.nome}</p>
                    <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>{`\u20ac${r.prezzo_unitario.toFixed(2)} x ${r.qta}`}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button onClick={() => cambiaQta(r.id, -1, carrelloIngrosso, setCarrelloIngrosso)} style={{ ...s.btn, padding: '4px 8px', background: '#f1f5f9', color: '#374151' }}>-</button>
                    <span style={{ fontWeight: '700' }}>{r.qta}</span>
                    <button onClick={() => cambiaQta(r.id, 1, carrelloIngrosso, setCarrelloIngrosso)} style={{ ...s.btn, padding: '4px 8px', background: '#f1f5f9', color: '#374151' }}>+</button>
                    <span style={{ fontWeight: '700', minWidth: '65px', textAlign: 'right' }}>{`\u20ac${(r.prezzo_unitario * r.qta).toFixed(2)}`}</span>
                    <button onClick={() => rimuoviDaCarrello(r.id, carrelloIngrosso, setCarrelloIngrosso)} style={{ ...s.btn, padding: '4px 8px', background: '#fee2e2', color: '#991b1b', fontSize: '12px' }}>x</button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0', borderTop: '2px solid #0f172a', marginTop: '8px' }}>
                <span style={{ fontWeight: '700', fontSize: '16px' }}>TOTALE</span>
                <span style={{ fontWeight: '700', fontSize: '20px', color: '#8b5cf6' }}>{`\u20ac${totaleCarrello(carrelloIngrosso).toFixed(2)}`}</span>
              </div>
              {clienteSelezionato.fido > 0 && totaleCarrello(carrelloIngrosso) + clienteSelezionato.saldo_aperto > clienteSelezionato.fido && (
                <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
                  <p style={{ color: '#991b1b', fontSize: '13px', fontWeight: '600', margin: 0 }}>Attenzione: fido superato! Fido disponibile: {`\u20ac${(clienteSelezionato.fido - clienteSelezionato.saldo_aperto).toFixed(2)}`}</p>
                </div>
              )}
              <div style={{ marginTop: '14px' }}>
                <label style={s.lbl}>Tipo documento</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {['fattura', 'ddt', 'preventivo'].map(t => (
                    <button key={t} onClick={() => setTipoDocumento(t)}
                      style={{ ...s.btn, flex: 1, background: tipoDocumento === t ? '#8b5cf6' : '#f1f5f9', color: tipoDocumento === t ? 'white' : '#374151', fontSize: '13px', textTransform: 'capitalize' as const }}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={() => {
                  const tipo = tipoDocumento === 'fattura' ? 'Fattura' : tipoDocumento === 'ddt' ? 'DDT' : 'Preventivo'
                  completaVendita(carrelloIngrosso, 0, 'bonifico', tipo, clienteSelezionato.nome)
                  alert(`${tipo} emessa per ${clienteSelezionato.nome}!\nTotale: \u20ac${totaleCarrello(carrelloIngrosso).toFixed(2)}`)
                  setCarrelloIngrosso([])
                  setClienteSelezionato(null)
                }} style={{ ...s.btn, width: '100%', background: '#8b5cf6', color: 'white', fontSize: '15px', padding: '14px' }}>
                  Emetti {tipoDocumento.toUpperCase()}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ===== ARCHIVIO DOCUMENTI =====
  if (modalita === 'documenti') return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button onClick={() => setModalita('scelta')} style={{ ...s.btn, background: '#f1f5f9', color: '#374151', padding: '8px 12px' }}>Indietro</button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Archivio Documenti</h1>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{documenti.length} documenti</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Scontrini', count: documenti.filter(d => d.tipo === 'Scontrino').length, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Fatture', count: documenti.filter(d => d.tipo === 'Fattura').length, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'Ricevute', count: documenti.filter(d => d.tipo === 'Ricevuta').length, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Totale', count: `\u20ac${documenti.reduce((s, d) => s + d.totale, 0).toFixed(2)}`, color: '#f59e0b', bg: '#fffbeb' },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, borderRadius: '12px', padding: '14px', border: `1px solid ${k.color}22` }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' as const }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: '20px', fontWeight: '700', margin: 0 }}>{k.count}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {documenti.map(d => {
          const colori: Record<string, { bg: string; color: string }> = {
            Scontrino: { bg: '#eff6ff', color: '#3b82f6' },
            Fattura: { bg: '#f5f3ff', color: '#8b5cf6' },
            Ricevuta: { bg: '#f0fdf4', color: '#22c55e' },
            DDT: { bg: '#fffbeb', color: '#f59e0b' },
            Preventivo: { bg: '#fef2f2', color: '#ef4444' },
          }
          const c = colori[d.tipo] || { bg: '#f1f5f9', color: '#374151' }
          return (
            <div key={d.id} style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700' }}>{d.tipo}</span>
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>{d.numero}</span>
                  </div>
                  <p style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a', margin: '0 0 2px' }}>{d.cliente}</p>
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>{d.data} — {d.pagamento}</p>
                </div>
                <p style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a', margin: 0 }}>{`\u20ac${d.totale.toFixed(2)}`}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ===== CHIUSURA CASSA =====
  if (modalita === 'chiusura') {
    const incassoContanti = documenti.filter(d => d.pagamento === 'contanti').reduce((s, d) => s + d.totale, 0)
    const incassoCarta = documenti.filter(d => d.pagamento === 'carta').reduce((s, d) => s + d.totale, 0)
    const incassoBonifico = documenti.filter(d => d.pagamento === 'bonifico').reduce((s, d) => s + d.totale, 0)
    const totaleGiorno = incassoContanti + incassoCarta + incassoBonifico
    return (
      <div style={s.page}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button onClick={() => setModalita('scelta')} style={{ ...s.btn, background: '#f1f5f9', color: '#374151', padding: '8px 12px' }}>Indietro</button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Chiusura Cassa</h1>
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <div style={{ ...s.card, background: 'linear-gradient(135deg, #0f172a, #1e40af)', color: 'white', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 4px', opacity: 0.7 }}>TOTALE INCASSATO OGGI</p>
          <p style={{ fontSize: '36px', fontWeight: '700', margin: 0 }}>{`\u20ac${totaleGiorno.toFixed(2)}`}</p>
          <p style={{ fontSize: '13px', margin: '8px 0 0', opacity: 0.7 }}>{documenti.length} transazioni</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Contanti', value: incassoContanti, icon: '\ud83d\udcb5', color: '#22c55e', bg: '#f0fdf4' },
            { label: 'Carta / POS', value: incassoCarta, icon: '\ud83d\udcb3', color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Bonifico', value: incassoBonifico, icon: '\ud83c\udfe6', color: '#8b5cf6', bg: '#f5f3ff' },
          ].map((r, i) => (
            <div key={i} style={{ background: r.bg, borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{r.icon}</span>
                <span style={{ fontWeight: '600', fontSize: '15px', color: '#374151' }}>{r.label}</span>
              </div>
              <span style={{ fontWeight: '700', fontSize: '20px', color: r.color }}>{`\u20ac${r.value.toFixed(2)}`}</span>
            </div>
          ))}
        </div>
        <div style={s.card}>
          <h3 style={{ fontWeight: '700', fontSize: '15px', margin: '0 0 12px' }}>Riepilogo per tipo documento</h3>
          {['Scontrino', 'Fattura', 'Ricevuta', 'DDT'].map(tipo => {
            const docs = documenti.filter(d => d.tipo === tipo)
            if (docs.length === 0) return null
            return (
              <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#374151', fontSize: '14px' }}>{tipo} ({docs.length})</span>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{`\u20ac${docs.reduce((s, d) => s + d.totale, 0).toFixed(2)}`}</span>
              </div>
            )
          })}
        </div>
        <button style={{ ...s.btn, width: '100%', background: '#ef4444', color: 'white', fontSize: '15px', padding: '14px', marginTop: '8px' }}
          onClick={() => alert('Chiusura cassa eseguita!\nStampa Z generata.')}>
          Esegui Chiusura e Stampa Z
        </button>
      </div>
    )
  }

  return null
}
