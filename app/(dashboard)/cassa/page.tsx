'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'
const PAGAMENTI = ['Contanti', 'Carta', 'Bonifico', 'Assegno', 'RiBa']
const LISTINI = ['Base', 'Ingrosso', 'Promo', 'VIP']

function calcolaRiga(r: any) {
  const prezzoScontato = (r.prezzo || 0) * (1 - (r.sconto || 0) / 100)
  const importo = prezzoScontato * (r.qta || 1) * (1 + (r.iva || 22) / 100)
  return { ...r, importo: Math.round(importo * 100) / 100 }
}

export default function CassaPage() {
  const [righe, setRighe] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [articoli, setArticoli] = useState<any[]>([])
  const [varianti, setVarianti] = useState<any[]>([])
  const [documentiAperti, setDocumentiAperti] = useState<any[]>([])
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [listino, setListino] = useState('Base')
  const [pagamento, setPagamento] = useState('Contanti')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cercaCliente, setCercaCliente] = useState('')
  const [suggerimentiClienti, setSuggerimentiClienti] = useState<any[]>([])
  const [cercaArt, setCercaArt] = useState('')
  const [suggerimentiArt, setSuggerimentiArt] = useState<any[]>([])
  const [modalPagamento, setModalPagamento] = useState(false)
  const [importoPagato, setImportoPagato] = useState('')
  const [modalDocumenti, setModalDocumenti] = useState(false)
  const [tab, setTab] = useState<'cassa'|'incasso'>('cassa')
  const barcodeInput = useRef<HTMLInputElement>(null)
  const cercaArtRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBase()
    // Focus sul barcode input all'avvio
    setTimeout(() => barcodeInput.current?.focus(), 300)
  }, [])

  async function loadBase() {
    const [{ data: cls }, { data: arts }, { data: vars }] = await Promise.all([
      supabaseAdmin.from('clienti').select('id, nome, piva, listino').order('nome'),
      supabaseAdmin.from('articoli').select('id, nome, codice, ean, prezzo, prezzo_ingrosso, prezzo_promo, prezzo_vip, iva, um, stock').order('nome'),
      supabaseAdmin.from('varianti_articolo').select('id, articolo_id, colore_nome, misura_nome, ean, codice_variante, prezzo_override, stock'),
    ])
    setClienti(cls || [])
    setArticoli(arts || [])
    setVarianti(vars || [])
  }

  async function loadDocumentiCliente(clienteId: string) {
    const { data } = await supabaseAdmin.from('documenti').select('*').eq('cliente_id', clienteId).in('stato', ['confermato', 'bozza']).order('data_documento', { ascending: false })
    setDocumentiAperti(data || [])
  }

  function getPrezzoListino(art: any, lst: string) {
    if (lst === 'Ingrosso' && art.prezzo_ingrosso > 0) return art.prezzo_ingrosso
    if (lst === 'Promo' && art.prezzo_promo > 0) return art.prezzo_promo
    if (lst === 'VIP' && art.prezzo_vip > 0) return art.prezzo_vip
    return art.prezzo || 0
  }

  function cercaArticoloPerEan(query: string): any | null {
    const q = query.trim().toLowerCase()
    const varMatch = varianti.find(v => v.ean?.toLowerCase() === q || v.codice_variante?.toLowerCase() === q)
    if (varMatch) {
      const art = articoli.find(a => a.id === varMatch.articolo_id)
      if (art) return { art, variante: varMatch }
    }
    const artMatch = articoli.find(a => a.ean?.toLowerCase() === q || a.codice?.toLowerCase() === q)
    if (artMatch) return { art: artMatch, variante: null }
    return null
  }

  function aggiungiArticolo(art: any, variante: any) {
    const prezzo = variante?.prezzo_override || getPrezzoListino(art, listino)
    const desc = art.nome + (variante ? ` - ${[variante.colore_nome, variante.misura_nome].filter(Boolean).join(' ')}` : '')
    // Cerca se esiste già la stessa riga
    const idxEsistente = righe.findIndex(r => r.articolo_id === art.id && r.variante_id === (variante?.id || null))
    if (idxEsistente >= 0) {
      const newRighe = [...righe]
      newRighe[idxEsistente] = calcolaRiga({ ...newRighe[idxEsistente], qta: newRighe[idxEsistente].qta + 1 })
      setRighe(newRighe)
    } else {
      const nuova = calcolaRiga({ articolo_id: art.id, variante_id: variante?.id || null, codice: variante?.codice_variante || art.codice || '', ean: variante?.ean || art.ean || '', descrizione: desc, um: art.um || 'Pz', qta: 1, prezzo, sconto: 0, iva: art.iva || 22, importo: 0 })
      setRighe(r => [...r, nuova])
    }
    setSuggerimentiArt([])
    setCercaArt('')
    // Rimetti focus sul barcode
    setTimeout(() => barcodeInput.current?.focus(), 100)
  }

  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const val = (e.target as HTMLInputElement).value.trim()
      if (!val) return
      const found = cercaArticoloPerEan(val)
      if (found) {
        aggiungiArticolo(found.art, found.variante)
        setError('')
      } else {
        setError('Articolo non trovato: ' + val)
        setTimeout(() => setError(''), 3000)
      }
      ;(e.target as HTMLInputElement).value = ''
    }
  }

  function handleCercaArt(q: string) {
    setCercaArt(q)
    if (q.length < 2) { setSuggerimentiArt([]); return }
    const ql = q.toLowerCase()
    const matches: any[] = []
    articoli.forEach(art => {
      if (art.nome?.toLowerCase().includes(ql) || art.codice?.toLowerCase().includes(ql) || art.ean?.includes(ql)) {
        matches.push({ art, variante: null })
      }
      varianti.filter(v => v.articolo_id === art.id).forEach(v => {
        if (v.ean?.includes(ql) || v.codice_variante?.toLowerCase().includes(ql) || art.nome?.toLowerCase().includes(ql)) {
          matches.push({ art, variante: v })
        }
      })
    })
    setSuggerimentiArt(matches.slice(0, 12))
  }

  function aggiornaQta(idx: number, delta: number) {
    const newRighe = [...righe]
    const nuovaQta = Math.max(0, newRighe[idx].qta + delta)
    if (nuovaQta === 0) { newRighe.splice(idx, 1); setRighe(newRighe); return }
    newRighe[idx] = calcolaRiga({ ...newRighe[idx], qta: nuovaQta })
    setRighe(newRighe)
  }

  function rimuoviRiga(idx: number) {
    setRighe(r => r.filter((_, i) => i !== idx))
  }

  function setQta(idx: number, qta: number) {
    if (qta <= 0) { rimuoviRiga(idx); return }
    const newRighe = [...righe]
    newRighe[idx] = calcolaRiga({ ...newRighe[idx], qta })
    setRighe(newRighe)
  }

  const totale = righe.reduce((s, r) => s + (r.importo || 0), 0)
  const nArticoli = righe.reduce((s, r) => s + (r.qta || 0), 0)
  const resto = parseFloat(importoPagato || '0') - totale

  async function completaVendita() {
    if (righe.length === 0) { setError('Aggiungi almeno un articolo'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const anno = new Date().getFullYear()
    const { data: lastDoc } = await supabaseAdmin.from('documenti').select('numero_doc').like('numero_doc', `${anno}_INC%`).order('numero_doc', { ascending: false }).limit(1)
    const lastNum = lastDoc?.[0]?.numero_doc ? parseInt(lastDoc[0].numero_doc.split('INC').pop() || '0') + 1 : 1
    const numDoc = `${anno}_INC${String(lastNum).padStart(5, '0')}`
    const totImponibile = righe.reduce((s, r) => s + ((r.importo || 0) / (1 + (r.iva || 22) / 100)), 0)
    const totIva = totale - totImponibile
    const docPayload = {
      user_id: uid, tipo: 'incasso', numero_doc: numDoc, anno,
      cliente_id: clienteSelezionato?.id || null, cliente_nome: clienteSelezionato?.nome || 'Cliente generico',
      data_registrazione: new Date().toISOString().split('T')[0], data_documento: new Date().toISOString().split('T')[0],
      pagamento, listino, note, stato: 'fatturato',
      totale_imponibile: Math.round(totImponibile * 100) / 100,
      totale_iva: Math.round(totIva * 100) / 100,
      totale_documento: Math.round(totale * 100) / 100,
    }
    const { data: docSalvato, error: eDoc } = await supabaseAdmin.from('documenti').insert([docPayload]).select().single()
    if (eDoc) { setError('Errore: ' + eDoc.message); setSaving(false); return }
    const righePayload = righe.map((r, i) => ({
      documento_id: docSalvato.id, user_id: uid, riga_num: i + 1,
      articolo_id: r.articolo_id, codice: r.codice, ean: r.ean, descrizione: r.descrizione,
      um: r.um, qta: r.qta, prezzo: r.prezzo, sconto1: r.sconto || 0, sconto2: 0, iva: r.iva,
      imponibile: Math.round((r.importo / (1 + r.iva / 100)) * 100) / 100, importo: r.importo,
    }))
    await supabaseAdmin.from('documenti_righe').insert(righePayload)
    if (clienteSelezionato) {
      const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', clienteSelezionato.id).order('created_at', { ascending: false }).limit(1)
      const saldoPrec = lastMov?.[0]?.saldo_progressivo || 0
      await supabaseAdmin.from('mastino_clienti').insert([{
        user_id: uid, cliente_id: clienteSelezionato.id, cliente_nome: clienteSelezionato.nome,
        documento_id: docSalvato.id, numero_doc: numDoc, data_movimento: new Date().toISOString().split('T')[0],
        causale: `Incasso cassa - ${numDoc}`, tipo_movimento: 'avere',
        importo_dare: 0, importo_avere: totale, saldo_progressivo: saldoPrec - totale, pagato: true
      }])
    }
    setSuccess(`Vendita completata! Scontrino: ${numDoc}`)
    setRighe([])
    setModalPagamento(false)
    setImportoPagato('')
    setTimeout(() => setSuccess(''), 4000)
    setSaving(false)
    setTimeout(() => barcodeInput.current?.focus(), 200)
  }

  async function incassaDocumento(doc: any) {
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    await supabaseAdmin.from('documenti').update({ stato: 'fatturato', pagamento }).eq('id', doc.id)
    const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', doc.cliente_id).order('created_at', { ascending: false }).limit(1)
    const saldoPrec = lastMov?.[0]?.saldo_progressivo || 0
    await supabaseAdmin.from('mastino_clienti').insert([{
      user_id: uid, cliente_id: doc.cliente_id, cliente_nome: doc.cliente_nome,
      documento_id: doc.id, numero_doc: doc.numero_doc, data_movimento: new Date().toISOString().split('T')[0],
      causale: `Incasso ${doc.numero_doc} - ${pagamento}`, tipo_movimento: 'avere',
      importo_dare: 0, importo_avere: doc.totale_documento, saldo_progressivo: saldoPrec - doc.totale_documento, pagato: true
    }])
    if (doc.data_scadenza) {
      await supabaseAdmin.from('scadenzario').update({ pagato: true, importo_residuo: 0, data_pagamento: new Date().toISOString().split('T')[0] }).eq('documento_id', doc.id)
    }
    setSuccess(`Documento ${doc.numero_doc} incassato!`)
    loadDocumentiCliente(doc.cliente_id)
    setSaving(false)
  }

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Header Cassa */}
      <div style={{ background: '#1e293b', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setTab('cassa')} style={{ background: tab === 'cassa' ? '#3b82f6' : '#334155', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Cassa</button>
          <button onClick={() => { setTab('incasso'); if (clienteSelezionato) loadDocumentiCliente(clienteSelezionato.id) }} style={{ background: tab === 'incasso' ? '#10b981' : '#334155', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Incassa Documento</button>
        </div>
        {/* Cliente */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
          <input value={cercaCliente} onChange={e => {
            setCercaCliente(e.target.value)
            if (!e.target.value) { setClienteSelezionato(null); setSuggerimentiClienti([]); return }
            const q = e.target.value.toLowerCase()
            setSuggerimentiClienti(clienti.filter(c => c.nome?.toLowerCase().includes(q)).slice(0, 8))
          }} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: clienteSelezionato ? '#60a5fa' : '#94a3b8', outline: 'none', boxSizing: 'border-box' }} placeholder={clienteSelezionato ? clienteSelezionato.nome : 'Cliente (opzionale)...'} />
          {suggerimentiClienti.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, zIndex: 100, maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
              {suggerimentiClienti.map(c => (
                <div key={c.id} onClick={() => { setClienteSelezionato(c); setCercaCliente(c.nome); setSuggerimentiClienti([]); setListino(c.listino || listino); if (tab === 'incasso') loadDocumentiCliente(c.id) }} style={{ padding: '10px 14px', cursor: 'pointer', color: '#e2e8f0', fontSize: 13, borderBottom: '1px solid #334155' }} onMouseEnter={e => (e.currentTarget.style.background = '#334155')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {c.nome}{c.piva ? ` · ${c.piva}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
        <select value={listino} onChange={e => setListino(e.target.value)} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#94a3b8', outline: 'none' }}>
          {LISTINI.map(l => <option key={l}>{l}</option>)}
        </select>
        <select value={pagamento} onChange={e => setPagamento(e.target.value)} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#94a3b8', outline: 'none' }}>
          {PAGAMENTI.map(p => <option key={p}>{p}</option>)}
        </select>
        {clienteSelezionato && <button onClick={() => { setClienteSelezionato(null); setCercaCliente('') }} style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>x Cliente</button>}
      </div>

      {tab === 'cassa' && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Colonna sinistra: ricerca + lista articoli */}
          <div style={{ width: 300, background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 12, borderBottom: '1px solid #334155' }}>
              <input ref={cercaArtRef} value={cercaArt} onChange={e => handleCercaArt(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box' }} placeholder="Cerca articolo..." />
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {cercaArt.length >= 2 && suggerimentiArt.map((s, i) => (
                <div key={i} onClick={() => aggiungiArticolo(s.art, s.variante)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #1e293b', background: '#1e293b' }} onMouseEnter={e => (e.currentTarget.style.background = '#334155')} onMouseLeave={e => (e.currentTarget.style.background = '#1e293b')}>
                  <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{s.art.nome}{s.variante ? ` - ${[s.variante.colore_nome, s.variante.misura_nome].filter(Boolean).join(' ')}` : ''}</div>
                  <div style={{ color: '#60a5fa', fontSize: 12, marginTop: 2 }}>euro{getPrezzoListino(s.art, listino).toFixed(2)} · {s.art.iva}%</div>
                </div>
              ))}
              {cercaArt.length < 2 && (
                <div style={{ padding: 16 }}>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Ultimi articoli:</div>
                  {articoli.slice(0, 20).map(art => (
                    <div key={art.id} onClick={() => aggiungiArticolo(art, null)} style={{ padding: '8px 10px', cursor: 'pointer', borderRadius: 6, marginBottom: 4 }} onMouseEnter={e => (e.currentTarget.style.background = '#334155')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ color: '#e2e8f0', fontSize: 13 }}>{art.nome}</div>
                      <div style={{ color: '#60a5fa', fontSize: 12 }}>euro{getPrezzoListino(art, listino).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonna centrale: righe scontrino */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Barcode input */}
            <div style={{ padding: '8px 12px', background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>EAN/Barcode:</span>
              <input ref={barcodeInput} onKeyDown={handleBarcodeKeyDown} style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '7px 12px', fontSize: 14, color: '#e2e8f0', outline: 'none' }} placeholder="Scansiona o digita EAN + INVIO..." />
              {error && <span style={{ color: '#ef4444', fontSize: 12 }}>{error}</span>}
            </div>

            {/* Lista righe */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {righe.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
                  <div style={{ fontSize: 60, marginBottom: 12 }}>🛒</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Cassa pronta</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Scansiona un articolo o cercalo a sinistra</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
                      {['Articolo', 'Qta', 'Prezzo', 'Sc%', 'Importo', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {righe.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b', background: idx % 2 === 0 ? '#0f172a' : '#111827' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>{r.descrizione}</div>
                          {r.ean && <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>{r.ean}</div>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => aggiornaQta(idx, -1)} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                            <input type="number" value={r.qta} onChange={e => setQta(idx, Number(e.target.value))} style={{ width: 50, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 6px', fontSize: 14, color: '#e2e8f0', textAlign: 'center', outline: 'none' }} />
                            <button onClick={() => aggiornaQta(idx, 1)} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input type="number" step="0.01" value={r.prezzo} onChange={e => { const nr = [...righe]; nr[idx] = calcolaRiga({ ...nr[idx], prezzo: Number(e.target.value) }); setRighe(nr) }} style={{ width: 80, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 14, color: '#60a5fa', outline: 'none' }} />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input type="number" step="0.1" value={r.sconto || 0} onChange={e => { const nr = [...righe]; nr[idx] = calcolaRiga({ ...nr[idx], sconto: Number(e.target.value) }); setRighe(nr) }} style={{ width: 55, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 14, color: '#f59e0b', outline: 'none' }} />
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 15, fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>euro{(r.importo || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <button onClick={() => rimuoviRiga(idx)} style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>x</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Colonna destra: totale e pagamento */}
          <div style={{ width: 260, background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: 16 }}>
            {success && <div style={{ background: '#064e3b', color: '#6ee7b7', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13, textAlign: 'center' }}>{success}</div>}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Articoli</div>
                <div style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700 }}>{nArticoli} pz</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Righe</div>
                <div style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700 }}>{righe.length}</div>
              </div>
              {clienteSelezionato && (
                <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>Cliente</div>
                  <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginTop: 2 }}>{clienteSelezionato.nome}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>Listino: {listino}</div>
                </div>
              )}
              <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>TOTALE</div>
                <div style={{ color: '#10b981', fontSize: 36, fontWeight: 800, lineHeight: 1 }}>euro{totale.toFixed(2)}</div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>{pagamento}</div>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#94a3b8', outline: 'none', resize: 'none', height: 60, boxSizing: 'border-box' }} placeholder="Note..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { if (righe.length === 0) return; setImportoPagato(totale.toFixed(2)); setModalPagamento(true) }} disabled={righe.length === 0} style={{ background: righe.length > 0 ? '#10b981' : '#1e293b', color: righe.length > 0 ? '#fff' : '#334155', border: 'none', borderRadius: 10, padding: '14px', cursor: righe.length > 0 ? 'pointer' : 'default', fontWeight: 800, fontSize: 18 }}>
                PAGA euro{totale.toFixed(2)}
              </button>
              <button onClick={() => setRighe([])} style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Annulla Scontrino</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'incasso' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {!clienteSelezionato ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8' }}>Seleziona un cliente in alto per vedere i documenti da incassare</div>
            </div>
          ) : (
            <div>
              <h3 style={{ color: '#e2e8f0', marginBottom: 16 }}>Documenti aperti - {clienteSelezionato.nome}</h3>
              {documentiAperti.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Nessun documento aperto per questo cliente</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {documentiAperti.map(doc => (
                    <div key={doc.id} style={{ background: '#1e293b', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>{doc.numero_doc}</div>
                        <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{doc.tipo} · {doc.data_documento ? new Date(doc.data_documento).toLocaleDateString('it-IT') : '--'} · {doc.stato}</div>
                        {doc.data_scadenza && <div style={{ color: new Date(doc.data_scadenza) < new Date() ? '#ef4444' : '#f59e0b', fontSize: 12, marginTop: 2 }}>Scad: {new Date(doc.data_scadenza).toLocaleDateString('it-IT')}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ color: '#10b981', fontSize: 22, fontWeight: 800 }}>euro{Number(doc.totale_documento || 0).toFixed(2)}</div>
                        <button onClick={() => incassaDocumento(doc)} disabled={saving} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>INCASSA</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {success && <div style={{ background: '#064e3b', color: '#6ee7b7', padding: 14, borderRadius: 8, marginTop: 16, textAlign: 'center', fontWeight: 600 }}>{success}</div>}
        </div>
      )}

      {/* Modal pagamento */}
      {modalPagamento && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 32, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: '#e2e8f0', margin: '0 0 24px', fontSize: 22 }}>Pagamento</h2>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>Modalita</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PAGAMENTI.map(p => <button key={p} onClick={() => setPagamento(p)} style={{ background: pagamento === p ? '#3b82f6' : '#334155', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: pagamento === p ? 700 : 400, fontSize: 13 }}>{p}</button>)}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>Importo ricevuto</div>
              <input type="number" step="0.01" value={importoPagato} onChange={e => setImportoPagato(e.target.value)} style={{ width: '100%', background: '#0f172a', border: '2px solid #3b82f6', borderRadius: 8, padding: '12px 16px', fontSize: 24, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box', textAlign: 'right' }} autoFocus />
            </div>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 14 }}>Totale</span>
                <span style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700 }}>euro{totale.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: 14 }}>Resto</span>
                <span style={{ color: resto >= 0 ? '#10b981' : '#ef4444', fontSize: 20, fontWeight: 800 }}>euro{resto.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalPagamento(false)} style={{ flex: 1, background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 8, padding: 14, cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
              <button onClick={completaVendita} disabled={saving} style={{ flex: 2, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: 14, cursor: 'pointer', fontWeight: 800, fontSize: 16 }}>{saving ? 'Salvataggio...' : 'CONFERMA VENDITA'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
