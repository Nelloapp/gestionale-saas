'use client'
import { useState } from 'react'

type Variante = {
  id: number; sku: string; tipo: string; valore: string;
  prezzo_diff: number; stock: number; ean: string;
}

type Articolo = {
  id: number; codice: string; ean: string; codice_fornitore: string;
  nome: string; descrizione: string; categoria: string; sottocategoria: string;
  unita: string; iva: number; stato: string;
  costo: number; ricarica: number; prezzo_base: number;
  listino_base: number; listino_premium: number; listino_rivenditori: number;
  stock: number; stock_minimo: number; stock_massimo: number;
  ubicazione: string; fornitore: string; tempo_riordino: number;
  peso: number; larghezza: number; altezza: number; profondita: number;
  note: string; data_creazione: string;
  varianti: Variante[];
}

const articoliDemo: Articolo[] = [
  {
    id: 1, codice: 'ART-001', ean: '8001234567890', codice_fornitore: 'FORN-A001',
    nome: 'T-Shirt Cotone Premium', descrizione: 'T-shirt in cotone 100% biologico, disponibile in vari colori e taglie',
    categoria: 'Abbigliamento', sottocategoria: 'T-Shirt', unita: 'pz', iva: 22, stato: 'attivo',
    costo: 8.50, ricarica: 120, prezzo_base: 18.70,
    listino_base: 18.70, listino_premium: 16.80, listino_rivenditori: 12.50,
    stock: 145, stock_minimo: 20, stock_massimo: 500,
    ubicazione: 'A1-S3', fornitore: 'Tessuti Italia SRL', tempo_riordino: 7,
    peso: 0.2, larghezza: 30, altezza: 40, profondita: 2,
    note: 'Bestseller stagione estiva', data_creazione: '2024-01-10',
    varianti: [
      { id: 1, sku: 'ART-001-S-BLU', tipo: 'Taglia/Colore', valore: 'S - Blu', prezzo_diff: 0, stock: 30, ean: '8001234567891' },
      { id: 2, sku: 'ART-001-M-BLU', tipo: 'Taglia/Colore', valore: 'M - Blu', prezzo_diff: 0, stock: 45, ean: '8001234567892' },
      { id: 3, sku: 'ART-001-L-ROSSO', tipo: 'Taglia/Colore', valore: 'L - Rosso', prezzo_diff: 2, stock: 25, ean: '8001234567893' },
      { id: 4, sku: 'ART-001-XL-NERO', tipo: 'Taglia/Colore', valore: 'XL - Nero', prezzo_diff: 3, stock: 45, ean: '8001234567894' },
    ]
  },
  {
    id: 2, codice: 'ART-002', ean: '8009876543210', codice_fornitore: 'FORN-B002',
    nome: 'Scarpa Running Pro', descrizione: 'Scarpa da running professionale con suola ammortizzante',
    categoria: 'Calzature', sottocategoria: 'Running', unita: 'pz', iva: 22, stato: 'attivo',
    costo: 45.00, ricarica: 100, prezzo_base: 90.00,
    listino_base: 90.00, listino_premium: 81.00, listino_rivenditori: 65.00,
    stock: 38, stock_minimo: 10, stock_massimo: 100,
    ubicazione: 'B2-S1', fornitore: 'Sport Goods SPA', tempo_riordino: 14,
    peso: 0.8, larghezza: 32, altezza: 12, profondita: 22,
    note: '', data_creazione: '2024-03-15',
    varianti: [
      { id: 5, sku: 'ART-002-39', tipo: 'Numero', valore: '39', prezzo_diff: 0, stock: 8, ean: '8009876543211' },
      { id: 6, sku: 'ART-002-41', tipo: 'Numero', valore: '41', prezzo_diff: 0, stock: 15, ean: '8009876543212' },
      { id: 7, sku: 'ART-002-43', tipo: 'Numero', valore: '43', prezzo_diff: 0, stock: 15, ean: '8009876543213' },
    ]
  },
  {
    id: 3, codice: 'ART-003', ean: '', codice_fornitore: '',
    nome: 'Consulenza Oraria', descrizione: 'Servizio di consulenza professionale a ore',
    categoria: 'Servizi', sottocategoria: 'Consulenza', unita: 'ora', iva: 22, stato: 'attivo',
    costo: 0, ricarica: 0, prezzo_base: 85.00,
    listino_base: 85.00, listino_premium: 75.00, listino_rivenditori: 70.00,
    stock: 999, stock_minimo: 0, stock_massimo: 999,
    ubicazione: '-', fornitore: '-', tempo_riordino: 0,
    peso: 0, larghezza: 0, altezza: 0, profondita: 0,
    note: 'Servizio non fisico', data_creazione: '2024-01-01',
    varianti: []
  },
]

const vuotoVariante = (): Variante => ({ id: Date.now(), sku: '', tipo: 'Taglia', valore: '', prezzo_diff: 0, stock: 0, ean: '' })

const vuotoForm = (): Articolo => ({
  id: 0, codice: '', ean: '', codice_fornitore: '', nome: '', descrizione: '',
  categoria: '', sottocategoria: '', unita: 'pz', iva: 22, stato: 'attivo',
  costo: 0, ricarica: 0, prezzo_base: 0,
  listino_base: 0, listino_premium: 0, listino_rivenditori: 0,
  stock: 0, stock_minimo: 0, stock_massimo: 0,
  ubicazione: '', fornitore: '', tempo_riordino: 0,
  peso: 0, larghezza: 0, altezza: 0, profondita: 0,
  note: '', data_creazione: new Date().toISOString().split('T')[0],
  varianti: []
})

export default function ArticoliPage() {
  const [articoli, setArticoli] = useState<Articolo[]>(articoliDemo)
  const [cerca, setCerca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('tutti')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [mostraForm, setMostraForm] = useState(false)
  const [mostraScheda, setMostraScheda] = useState<Articolo | null>(null)
  const [selezionato, setSelezionato] = useState<Articolo | null>(null)
  const [form, setForm] = useState<Articolo>(vuotoForm())
  const [tabForm, setTabForm] = useState('identificativo')

  const tabs = [
    { id: 'identificativo', label: '\ud83c\udff7\ufe0f Dati' },
    { id: 'prezzi', label: '\ud83d\udcb0 Prezzi' },
    { id: 'varianti', label: '\ud83c\udfa8 Varianti' },
    { id: 'magazzino', label: '\ud83d\udce6 Magazzino' },
  ]

  const inp: React.CSSProperties = { width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#374151' }
  const fld: React.CSSProperties = { marginBottom: '14px' }
  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }

  const categorie = ['tutti', ...Array.from(new Set(articoli.map(a => a.categoria)))]

  const filtrati = articoli.filter(a => {
    const q = cerca.toLowerCase()
    const matchCerca = a.nome.toLowerCase().includes(q) || a.codice.toLowerCase().includes(q) || a.ean.includes(q) || a.categoria.toLowerCase().includes(q)
    const matchCat = filtroCategoria === 'tutti' || a.categoria === filtroCategoria
    const matchStato = filtroStato === 'tutti' || a.stato === filtroStato
    return matchCerca && matchCat && matchStato
  })

  const calcolaPrezzo = (costo: number, ricarica: number) => parseFloat((costo * (1 + ricarica / 100)).toFixed(2))

  const aggiornaRicarica = (costo: number, ricarica: number) => {
    const base = calcolaPrezzo(costo, ricarica)
    setForm(f => ({
      ...f, costo, ricarica, prezzo_base: base,
      listino_base: base,
      listino_premium: parseFloat((base * 0.9).toFixed(2)),
      listino_rivenditori: parseFloat((base * 0.7).toFixed(2)),
    }))
  }

  const nuovoArticolo = () => {
    setSelezionato(null)
    setForm(vuotoForm())
    setTabForm('identificativo')
    setMostraForm(true)
  }

  const modifica = (a: Articolo) => {
    setSelezionato(a)
    setForm({ ...a })
    setTabForm('identificativo')
    setMostraForm(true)
  }

  const elimina = (id: number) => {
    if (confirm('Eliminare questo articolo?')) setArticoli(prev => prev.filter(a => a.id !== id))
  }

  const salva = () => {
    if (!form.nome.trim()) { alert('Inserisci il nome articolo'); return }
    if (selezionato) {
      setArticoli(prev => prev.map(a => a.id === selezionato.id ? { ...form, id: selezionato.id } : a))
    } else {
      setArticoli(prev => [...prev, { ...form, id: Date.now() }])
    }
    setMostraForm(false)
  }

  const aggiungiVariante = () => setForm(f => ({ ...f, varianti: [...f.varianti, vuotoVariante()] }))
  const rimuoviVariante = (id: number) => setForm(f => ({ ...f, varianti: f.varianti.filter(v => v.id !== id) }))
  const aggiornaVariante = (id: number, campo: keyof Variante, valore: string | number) => {
    setForm(f => ({ ...f, varianti: f.varianti.map(v => v.id === id ? { ...v, [campo]: valore } : v) }))
  }

  const stockColor = (s: number) => s === 0 ? '#991b1b' : s < 10 ? '#92400e' : '#166534'
  const stockBg = (s: number) => s === 0 ? '#fee2e2' : s < 10 ? '#fef9c3' : '#dcfce7'
  const statoColor = (s: string) => s === 'attivo' ? '#166534' : s === 'bozza' ? '#1e40af' : '#6b7280'
  const statoBg = (s: string) => s === 'attivo' ? '#dcfce7' : s === 'bozza' ? '#dbeafe' : '#f1f5f9'

  const totaleArticoli = articoli.length
  const totaleAttivi = articoli.filter(a => a.stato === 'attivo').length
  const sottoScorta = articoli.filter(a => a.stock <= a.stock_minimo && a.stock_minimo > 0).length
  const valoreStock = articoli.reduce((s, a) => s + a.costo * a.stock, 0)

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Articoli</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>Catalogo prodotti e servizi</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Totale Articoli', value: totaleArticoli, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Attivi', value: totaleAttivi, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'Sotto Scorta', value: sottoScorta, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Valore Stock', value: `\u20ac${valoreStock.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, color: '#8b5cf6', bg: '#f5f3ff' },
        ].map((k, i) => (
          <div key={i} style={{ background: k.bg, borderRadius: '12px', padding: '14px', border: `1px solid ${k.color}22` }}>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: '600', margin: '0 0 4px', textTransform: 'uppercase' }}>{k.label}</p>
            <p style={{ color: k.color, fontSize: '20px', fontWeight: '700', margin: 0 }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input value={cerca} onChange={e => setCerca(e.target.value)}
          placeholder="Cerca per nome, codice, EAN..."
          style={{ ...inp, marginBottom: '10px' }} />
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['tutti', 'attivo', 'bozza', 'fuori_produzione'].map(s => (
            <button key={s} onClick={() => setFiltroStato(s)}
              style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: filtroStato === s ? '#0f172a' : '#f1f5f9', color: filtroStato === s ? 'white' : '#374151' }}>
              {s === 'tutti' ? 'Tutti' : s === 'attivo' ? 'Attivi' : s === 'bozza' ? 'Bozze' : 'Fuori prod.'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginTop: '8px' }}>
          {categorie.map(c => (
            <button key={c} onClick={() => setFiltroCategoria(c)}
              style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', background: filtroCategoria === c ? '#3b82f6' : '#f1f5f9', color: filtroCategoria === c ? 'white' : '#374151' }}>
              {c === 'tutti' ? 'Tutte le categorie' : c}
            </button>
          ))}
        </div>
      </div>

      <button onClick={nuovoArticolo}
        style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px' }}>
        + Nuovo Articolo
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtrati.map(a => (
          <div key={a.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span style={{ background: statoBg(a.stato), color: statoColor(a.stato), padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }}>
                    {a.stato === 'attivo' ? 'Attivo' : a.stato === 'bozza' ? 'Bozza' : 'Fuori prod.'}
                  </span>
                  <span style={{ background: '#f1f5f9', color: '#374151', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }}>{a.categoria}</span>
                  {a.varianti.length > 0 && <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }}>{a.varianti.length} varianti</span>}
                </div>
                <p style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px', margin: '0 0 2px' }}>{a.nome}</p>
                <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{a.codice}{a.ean ? ` | EAN: ${a.ean}` : ''}</p>
              </div>
              <span style={{ background: stockBg(a.stock), color: stockColor(a.stock), padding: '4px 10px', borderRadius: '99px', fontSize: '12px', fontWeight: '700', marginLeft: '8px', whiteSpace: 'nowrap' }}>
                {a.stock === 0 ? 'Esaurito' : a.stock <= a.stock_minimo && a.stock_minimo > 0 ? `Scorta: ${a.stock}` : `${a.stock} ${a.unita}`}
              </span>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                <div>
                  <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', margin: '0 0 2px', textTransform: 'uppercase' }}>Base</p>
                  <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: '700', margin: 0 }}>{`\u20ac${a.listino_base.toFixed(2)}`}</p>
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', margin: '0 0 2px', textTransform: 'uppercase' }}>Premium</p>
                  <p style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: '700', margin: 0 }}>{`\u20ac${a.listino_premium.toFixed(2)}`}</p>
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: '10px', fontWeight: '600', margin: '0 0 2px', textTransform: 'uppercase' }}>Rivend.</p>
                  <p style={{ color: '#f59e0b', fontSize: '14px', fontWeight: '700', margin: 0 }}>{`\u20ac${a.listino_rivenditori.toFixed(2)}`}</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Costo: <strong>{`\u20ac${a.costo.toFixed(2)}`}</strong></span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>Ricarica: <strong>{a.ricarica}%</strong></span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>IVA: <strong>{a.iva}%</strong></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setMostraScheda(a)} style={{ flex: 1, background: '#f0fdf4', color: '#166534', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Scheda</button>
              <button onClick={() => modifica(a)} style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '13px', cursor: 'pointer' }}>Modifica</button>
              <button onClick={() => elimina(a.id)} style={{ flex: 1, background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', padding: '8px', fontSize: '13px', cursor: 'pointer' }}>Elimina</button>
            </div>
          </div>
        ))}
        {filtrati.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p style={{ fontWeight: '600' }}>Nessun articolo trovato</p>
          </div>
        )}
      </div>

      {mostraScheda && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Scheda Articolo</h2>
              <button onClick={() => setMostraScheda(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontWeight: '700', fontSize: '18px', color: '#0f172a', margin: '0 0 4px' }}>{mostraScheda.nome}</p>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>{mostraScheda.descrizione}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Codice', value: mostraScheda.codice },
                { label: 'EAN / Barcode', value: mostraScheda.ean || '-' },
                { label: 'Cod. Fornitore', value: mostraScheda.codice_fornitore || '-' },
                { label: 'Categoria', value: mostraScheda.categoria },
                { label: 'Sottocategoria', value: mostraScheda.sottocategoria || '-' },
                { label: 'Unita di misura', value: mostraScheda.unita },
                { label: 'IVA', value: `${mostraScheda.iva}%` },
                { label: 'Stato', value: mostraScheda.stato },
              ].map((r, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #f1f5f9' }}>
                  <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', margin: '0 0 2px', textTransform: 'uppercase' }}>{r.label}</p>
                  <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: '600', margin: 0 }}>{r.value}</p>
                </div>
              ))}
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: '0 0 10px' }}>Prezzi e Listini</h3>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Costo Acquisto', value: `\u20ac${mostraScheda.costo.toFixed(2)}`, color: '#374151' },
                  { label: 'Ricarica', value: `${mostraScheda.ricarica}%`, color: '#374151' },
                  { label: 'Listino Base', value: `\u20ac${mostraScheda.listino_base.toFixed(2)}`, color: '#0f172a' },
                  { label: 'Listino Premium', value: `\u20ac${mostraScheda.listino_premium.toFixed(2)}`, color: '#8b5cf6' },
                  { label: 'Listino Rivenditori', value: `\u20ac${mostraScheda.listino_rivenditori.toFixed(2)}`, color: '#f59e0b' },
                  { label: 'Prezzo IVA inclusa', value: `\u20ac${(mostraScheda.listino_base * (1 + mostraScheda.iva / 100)).toFixed(2)}`, color: '#22c55e' },
                ].map((r, i) => (
                  <div key={i}>
                    <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', margin: '0 0 2px', textTransform: 'uppercase' }}>{r.label}</p>
                    <p style={{ color: r.color, fontSize: '15px', fontWeight: '700', margin: 0 }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: '0 0 10px' }}>Magazzino</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Stock', value: `${mostraScheda.stock} ${mostraScheda.unita}` },
                { label: 'Min', value: `${mostraScheda.stock_minimo} ${mostraScheda.unita}` },
                { label: 'Max', value: `${mostraScheda.stock_massimo} ${mostraScheda.unita}` },
                { label: 'Ubicazione', value: mostraScheda.ubicazione || '-' },
                { label: 'Fornitore', value: mostraScheda.fornitore || '-' },
                { label: 'Riordino', value: mostraScheda.tempo_riordino ? `${mostraScheda.tempo_riordino} gg` : '-' },
              ].map((r, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '10px', border: '1px solid #f1f5f9' }}>
                  <p style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '600', margin: '0 0 2px', textTransform: 'uppercase' }}>{r.label}</p>
                  <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: '600', margin: 0 }}>{r.value}</p>
                </div>
              ))}
            </div>
            {mostraScheda.varianti.length > 0 && (
              <>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: '0 0 10px' }}>Varianti ({mostraScheda.varianti.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {mostraScheda.varianti.map(v => (
                    <div key={v.id} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '13px', margin: '0 0 2px' }}>{v.valore}</p>
                        <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>SKU: {v.sku}{v.ean ? ` | EAN: ${v.ean}` : ''}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '700', fontSize: '13px', color: v.prezzo_diff !== 0 ? '#3b82f6' : '#374151', margin: '0 0 2px' }}>
                          {v.prezzo_diff !== 0 ? `${v.prezzo_diff > 0 ? '+' : ''}\u20ac${v.prezzo_diff.toFixed(2)}` : 'Prezzo std.'}
                        </p>
                        <span style={{ background: stockBg(v.stock), color: stockColor(v.stock), padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: '600' }}>
                          {v.stock} pz
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {mostraScheda.note && (
              <div style={{ background: '#fffbeb', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#92400e', fontSize: '13px', margin: 0 }}>{mostraScheda.note}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mostraForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{selezionato ? 'Modifica Articolo' : 'Nuovo Articolo'}</h2>
              <button onClick={() => setMostraForm(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTabForm(t.id)}
                  style={{ whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: tabForm === t.id ? '#0f172a' : '#f1f5f9', color: tabForm === t.id ? 'white' : '#374151' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tabForm === 'identificativo' && (
              <div>
                <div style={fld}><label style={lbl}>Nome Articolo *</label><input style={inp} placeholder="Es. T-Shirt Cotone Premium" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Descrizione</label><textarea style={{ ...inp, minHeight: '80px', resize: 'vertical' as const }} placeholder="Descrizione dettagliata..." value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} /></div>
                <div style={{ ...grid2, ...fld }}>
                  <div><label style={lbl}>Codice Articolo</label><input style={inp} placeholder="ART-001" value={form.codice} onChange={e => setForm({ ...form, codice: e.target.value })} /></div>
                  <div><label style={lbl}>Codice EAN / Barcode</label><input style={inp} placeholder="8001234567890" value={form.ean} onChange={e => setForm({ ...form, ean: e.target.value })} /></div>
                </div>
                <div style={fld}><label style={lbl}>Codice Fornitore</label><input style={inp} placeholder="Codice usato dal fornitore" value={form.codice_fornitore} onChange={e => setForm({ ...form, codice_fornitore: e.target.value })} /></div>
                <div style={{ ...grid2, ...fld }}>
                  <div><label style={lbl}>Categoria</label><input style={inp} placeholder="Es. Abbigliamento" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></div>
                  <div><label style={lbl}>Sottocategoria</label><input style={inp} placeholder="Es. T-Shirt" value={form.sottocategoria} onChange={e => setForm({ ...form, sottocategoria: e.target.value })} /></div>
                </div>
                <div style={{ ...grid2, ...fld }}>
                  <div>
                    <label style={lbl}>Unita di misura</label>
                    <select style={inp} value={form.unita} onChange={e => setForm({ ...form, unita: e.target.value })}>
                      <option value="pz">Pezzo (pz)</option>
                      <option value="kg">Chilogrammo (kg)</option>
                      <option value="lt">Litro (lt)</option>
                      <option value="mt">Metro (mt)</option>
                      <option value="ora">Ora</option>
                      <option value="conf">Confezione</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>IVA %</label>
                    <select style={inp} value={form.iva} onChange={e => setForm({ ...form, iva: parseInt(e.target.value) })}>
                      <option value={22}>22%</option>
                      <option value={10}>10%</option>
                      <option value={4}>4%</option>
                      <option value={0}>Esente (0%)</option>
                    </select>
                  </div>
                </div>
                <div style={fld}>
                  <label style={lbl}>Stato</label>
                  <select style={inp} value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value })}>
                    <option value="attivo">Attivo</option>
                    <option value="bozza">Bozza</option>
                    <option value="fuori_produzione">Fuori produzione</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Note Interne</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' as const }} placeholder="Note private..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
              </div>
            )}

            {tabForm === 'prezzi' && (
              <div>
                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ color: '#1e40af', fontSize: '13px', fontWeight: '600', margin: 0 }}>Inserisci costo e ricarica per calcolare automaticamente i prezzi</p>
                </div>
                <div style={{ ...grid2, ...fld }}>
                  <div>
                    <label style={lbl}>Costo di Acquisto (euro)</label>
                    <input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={form.costo || ''} onChange={e => aggiornaRicarica(parseFloat(e.target.value) || 0, form.ricarica)} />
                  </div>
                  <div>
                    <label style={lbl}>Ricarica (%)</label>
                    <input style={inp} type="number" min="0" step="1" placeholder="0" value={form.ricarica || ''} onChange={e => aggiornaRicarica(form.costo, parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                {form.costo > 0 && form.ricarica > 0 && (
                  <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
                    <p style={{ color: '#166534', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                      Prezzo calcolato: <strong>{`\u20ac${calcolaPrezzo(form.costo, form.ricarica).toFixed(2)}`}</strong>
                    </p>
                  </div>
                )}
                <div style={fld}><label style={lbl}>Listino Base (euro)</label><input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={form.listino_base || ''} onChange={e => setForm({ ...form, listino_base: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fld}><label style={lbl}>Listino Premium (euro)</label><input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={form.listino_premium || ''} onChange={e => setForm({ ...form, listino_premium: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fld}><label style={lbl}>Listino Rivenditori (euro)</label><input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={form.listino_rivenditori || ''} onChange={e => setForm({ ...form, listino_rivenditori: parseFloat(e.target.value) || 0 })} /></div>
                {form.listino_base > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px' }}>
                    <p style={{ color: '#374151', fontSize: '13px', fontWeight: '700', margin: '0 0 8px' }}>Prezzi IVA inclusa ({form.iva}%)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                      {[
                        { label: 'Base', value: form.listino_base, color: '#0f172a' },
                        { label: 'Premium', value: form.listino_premium, color: '#8b5cf6' },
                        { label: 'Rivend.', value: form.listino_rivenditori, color: '#f59e0b' },
                      ].map((l, i) => (
                        <div key={i}>
                          <p style={{ color: '#94a3b8', fontSize: '11px', margin: '0 0 2px' }}>{l.label}</p>
                          <p style={{ color: l.color, fontSize: '14px', fontWeight: '700', margin: 0 }}>{`\u20ac${(l.value * (1 + form.iva / 100)).toFixed(2)}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tabForm === 'varianti' && (
              <div>
                <div style={{ background: '#faf5ff', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ color: '#7c3aed', fontSize: '13px', fontWeight: '600', margin: 0 }}>Aggiungi varianti per taglie, colori, misure o altre caratteristiche</p>
                </div>
                {form.varianti.map((v, idx) => (
                  <div key={v.id} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>Variante {idx + 1}</p>
                      <button onClick={() => rimuoviVariante(v.id)} style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>Rimuovi</button>
                    </div>
                    <div style={{ ...grid2, marginBottom: '8px' }}>
                      <div>
                        <label style={lbl}>Tipo</label>
                        <select style={inp} value={v.tipo} onChange={e => aggiornaVariante(v.id, 'tipo', e.target.value)}>
                          <option value="Taglia">Taglia</option>
                          <option value="Colore">Colore</option>
                          <option value="Taglia/Colore">Taglia/Colore</option>
                          <option value="Numero">Numero</option>
                          <option value="Misura">Misura</option>
                          <option value="Gusto">Gusto</option>
                          <option value="Altro">Altro</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Valore</label>
                        <input style={inp} placeholder="Es. M - Blu" value={v.valore} onChange={e => aggiornaVariante(v.id, 'valore', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ ...grid2, marginBottom: '8px' }}>
                      <div><label style={lbl}>SKU</label><input style={inp} placeholder="ART-001-M-BLU" value={v.sku} onChange={e => aggiornaVariante(v.id, 'sku', e.target.value)} /></div>
                      <div><label style={lbl}>EAN Variante</label><input style={inp} placeholder="8001234567891" value={v.ean} onChange={e => aggiornaVariante(v.id, 'ean', e.target.value)} /></div>
                    </div>
                    <div style={grid2}>
                      <div><label style={lbl}>Diff. Prezzo (euro)</label><input style={inp} type="number" step="0.01" placeholder="0.00" value={v.prezzo_diff || ''} onChange={e => aggiornaVariante(v.id, 'prezzo_diff', parseFloat(e.target.value) || 0)} /></div>
                      <div><label style={lbl}>Stock</label><input style={inp} type="number" min="0" placeholder="0" value={v.stock || ''} onChange={e => aggiornaVariante(v.id, 'stock', parseInt(e.target.value) || 0)} /></div>
                    </div>
                  </div>
                ))}
                <button onClick={aggiungiVariante}
                  style={{ width: '100%', background: '#ede9fe', color: '#7c3aed', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                  + Aggiungi Variante
                </button>
              </div>
            )}

            {tabForm === 'magazzino' && (
              <div>
                <div style={{ ...grid2, ...fld }}>
                  <div><label style={lbl}>Stock Attuale</label><input style={inp} type="number" min="0" placeholder="0" value={form.stock || ''} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} /></div>
                  <div><label style={lbl}>Stock Minimo</label><input style={inp} type="number" min="0" placeholder="0" value={form.stock_minimo || ''} onChange={e => setForm({ ...form, stock_minimo: parseInt(e.target.value) || 0 })} /></div>
                </div>
                <div style={fld}><label style={lbl}>Stock Massimo</label><input style={inp} type="number" min="0" placeholder="0" value={form.stock_massimo || ''} onChange={e => setForm({ ...form, stock_massimo: parseInt(e.target.value) || 0 })} /></div>
                <div style={fld}><label style={lbl}>Ubicazione in Magazzino</label><input style={inp} placeholder="Es. A1-S3" value={form.ubicazione} onChange={e => setForm({ ...form, ubicazione: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Fornitore Preferito</label><input style={inp} placeholder="Nome fornitore" value={form.fornitore} onChange={e => setForm({ ...form, fornitore: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Tempo di Riordino (giorni)</label><input style={inp} type="number" min="0" placeholder="0" value={form.tempo_riordino || ''} onChange={e => setForm({ ...form, tempo_riordino: parseInt(e.target.value) || 0 })} /></div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: '16px 0 10px' }}>Dimensioni e Peso</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={fld}><label style={lbl}>Peso (kg)</label><input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={form.peso || ''} onChange={e => setForm({ ...form, peso: parseFloat(e.target.value) || 0 })} /></div>
                  <div style={fld}><label style={lbl}>Larghezza (cm)</label><input style={inp} type="number" min="0" placeholder="0" value={form.larghezza || ''} onChange={e => setForm({ ...form, larghezza: parseFloat(e.target.value) || 0 })} /></div>
                  <div style={fld}><label style={lbl}>Altezza (cm)</label><input style={inp} type="number" min="0" placeholder="0" value={form.altezza || ''} onChange={e => setForm({ ...form, altezza: parseFloat(e.target.value) || 0 })} /></div>
                  <div style={fld}><label style={lbl}>Profondita (cm)</label><input style={inp} type="number" min="0" placeholder="0" value={form.profondita || ''} onChange={e => setForm({ ...form, profondita: parseFloat(e.target.value) || 0 })} /></div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {tabForm !== 'identificativo' && (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) - 1].id)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>Indietro</button>
              )}
              {tabForm !== 'magazzino' ? (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) + 1].id)}
                  style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>Avanti</button>
              ) : (
                <button onClick={salva}
                  style={{ flex: 1, background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer' }}>Salva Articolo</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
