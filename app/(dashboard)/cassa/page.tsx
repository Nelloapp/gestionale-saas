'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

interface RigaCassa {
  id: string
  articolo_id: string | null
  codice: string
  variante: string
  colore: string
  dis_taglia: string
  descrizione: string
  um: string
  qta: number
  prezzo: number
  sconto1: number
  iva: number
  imponibile: number
  importo: number
}

function calcRiga(prezzo: number, qta: number, sc1: number, iva: number) {
  const imp = Math.round(prezzo * qta * (1 - sc1/100) * 100) / 100
  const tot = Math.round(imp * (1 + iva/100) * 100) / 100
  return { imponibile: imp, importo: tot }
}

export default function CassaPage() {
  const [righe, setRighe] = useState<RigaCassa[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [articoliDB, setArticoliDB] = useState<any[]>([])
  const [variantiDB, setVariantiDB] = useState<any[]>([])
  const [documentiAperti, setDocumentiAperti] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [cercaCliente, setCercaCliente] = useState('')
  const [showClienti, setShowClienti] = useState(false)
  const [inputCliente, setInputCliente] = useState('')
  const [listino, setListino] = useState<'base'|'ingrosso'|'promo'|'vip'>('base')
  const [pagamento, setPagamento] = useState('contanti')
  const [sospeso, setSospeso] = useState(false)
  const [note, setNote] = useState('')
  const [cercaArt, setCercaArt] = useState('')
  const [risultatiArt, setRisultatiArt] = useState<any[]>([])
  const [showRisultati, setShowRisultati] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [importoRicevuto, setImportoRicevuto] = useState('')
  const [tab, setTab] = useState<'cassa'|'incasso'>('cassa')
  const [loadingDocs, setLoadingDocs] = useState(false)
  const barcodeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadBase()
    setTimeout(() => barcodeRef.current?.focus(), 300)
  }, [])

  async function loadBase() {
    const [{ data: cls }, { data: arts }, { data: vars }] = await Promise.all([
      supabaseAdmin.from('clienti').select('id, nome, cognome, ragione_sociale, listino').order('nome'),
      supabaseAdmin.from('articoli').select('id, nome, codice, ean, prezzo_base, prezzo_ingrosso, prezzo_promo, prezzo_vip, iva, um').order('nome'),
      supabaseAdmin.from('varianti_articolo').select('id, articolo_id, colore_nome, misura_nome, ean, codice_variante, prezzo_override'),
    ])
    setClienti(cls || [])
    setArticoliDB(arts || [])
    setVariantiDB(vars || [])
  }

  function getPrezzoListino(art: any): number {
    if (listino === 'ingrosso' && art.prezzo_ingrosso > 0) return art.prezzo_ingrosso
    if (listino === 'promo' && art.prezzo_promo > 0) return art.prezzo_promo
    if (listino === 'vip' && art.prezzo_vip > 0) return art.prezzo_vip
    return art.prezzo_base || 0
  }

  const eseguiRicerca = useCallback((q: string) => {
    if (!q || q.length < 1) { setRisultatiArt([]); setShowRisultati(false); return }
    const ql = q.toLowerCase()
    const risultati: any[] = []
    variantiDB.forEach(v => {
      if (v.ean?.toLowerCase() === ql || v.codice_variante?.toLowerCase() === ql) {
        const art = articoliDB.find(a => a.id === v.articolo_id)
        if (art) risultati.unshift({ tipo: 'variante', ...v, _art: art })
      }
    })
    articoliDB.forEach(a => {
      if (a.ean?.toLowerCase() === ql || a.codice?.toLowerCase() === ql) {
        if (!risultati.find(r => r.tipo === 'articolo' && r.id === a.id)) risultati.unshift({ tipo: 'articolo', ...a })
      }
    })
    articoliDB.forEach(a => {
      if (a.nome?.toLowerCase().includes(ql) || a.codice?.toLowerCase().includes(ql) || a.ean?.includes(ql)) {
        if (!risultati.find(r => r.tipo === 'articolo' && r.id === a.id)) risultati.push({ tipo: 'articolo', ...a })
      }
    })
    variantiDB.forEach(v => {
      if (v.ean?.toLowerCase().includes(ql) || v.codice_variante?.toLowerCase().includes(ql)) {
        const art = articoliDB.find(a => a.id === v.articolo_id)
        if (art && !risultati.find(r => r.tipo === 'variante' && r.id === v.id)) risultati.push({ tipo: 'variante', ...v, _art: art })
      }
    })
    setRisultatiArt(risultati.slice(0, 15))
    setShowRisultati(risultati.length > 0)
  }, [articoliDB, variantiDB])

  useEffect(() => {
    const t = setTimeout(() => eseguiRicerca(cercaArt), 150)
    return () => clearTimeout(t)
  }, [cercaArt, eseguiRicerca])

  function aggiungiDaRisultato(item: any) {
    let riga: RigaCassa
    if (item.tipo === 'variante') {
      const art = item._art
      const prezzo = item.prezzo_override || getPrezzoListino(art)
      const { imponibile, importo } = calcRiga(prezzo, 1, 0, art.iva || 22)
      riga = { id: crypto.randomUUID(), articolo_id: art.id, codice: art.codice || '', variante: item.codice_variante || '', colore: item.colore_nome || '', dis_taglia: item.misura_nome || '', descrizione: `${art.nome}${item.colore_nome ? ' - ' + item.colore_nome : ''}${item.misura_nome ? ' ' + item.misura_nome : ''}`, um: art.um || 'Pz', qta: 1, prezzo, sconto1: 0, iva: art.iva || 22, imponibile, importo }
    } else {
      const prezzo = getPrezzoListino(item)
      const { imponibile, importo } = calcRiga(prezzo, 1, 0, item.iva || 22)
      riga = { id: crypto.randomUUID(), articolo_id: item.id, codice: item.codice || '', variante: '', colore: '', dis_taglia: '', descrizione: item.nome, um: item.um || 'Pz', qta: 1, prezzo, sconto1: 0, iva: item.iva || 22, imponibile, importo }
    }
    setRighe(prev => {
      const idx = prev.findIndex(r => r.articolo_id === riga.articolo_id && r.variante === riga.variante)
      if (idx >= 0) {
        const up = [...prev]; const r = up[idx]; const nq = r.qta + 1; const c = calcRiga(r.prezzo, nq, r.sconto1, r.iva); up[idx] = { ...r, qta: nq, ...c }; return up
      }
      return [...prev, riga]
    })
    setCercaArt(''); setShowRisultati(false)
    setTimeout(() => barcodeRef.current?.focus(), 100)
  }

  function handleBarcodeEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const val = (e.target as HTMLInputElement).value.trim()
    if (!val) return
    ;(e.target as HTMLInputElement).value = ''
    const varMatch = variantiDB.find(v => v.ean === val || v.codice_variante === val)
    if (varMatch) { const art = articoliDB.find(a => a.id === varMatch.articolo_id); if (art) { aggiungiDaRisultato({ tipo: 'variante', ...varMatch, _art: art }); return } }
    const artMatch = articoliDB.find(a => a.ean === val || a.codice === val)
    if (artMatch) { aggiungiDaRisultato({ tipo: 'articolo', ...artMatch }); return }
    setError('Articolo non trovato: ' + val); setTimeout(() => setError(''), 3000)
  }

  function aggiornaQta(id: string, delta: number) {
    setRighe(prev => prev.map(r => {
      if (r.id !== id) return r
      const nq = Math.max(0, r.qta + delta)
      if (nq === 0) return null as any
      const c = calcRiga(r.prezzo, nq, r.sconto1, r.iva)
      return { ...r, qta: nq, ...c }
    }).filter(Boolean))
  }

  function setQtaDiretta(id: string, v: string) {
    const q = parseFloat(v) || 0
    if (q <= 0) { setRighe(prev => prev.filter(r => r.id !== id)); return }
    setRighe(prev => prev.map(r => { if (r.id !== id) return r; const c = calcRiga(r.prezzo, q, r.sconto1, r.iva); return { ...r, qta: q, ...c } }))
  }

  function setPrezzoDiretto(id: string, v: string) {
    const p = parseFloat(v) || 0
    setRighe(prev => prev.map(r => { if (r.id !== id) return r; const c = calcRiga(p, r.qta, r.sconto1, r.iva); return { ...r, prezzo: p, ...c } }))
  }

  const totImponibile = righe.reduce((s, r) => s + r.imponibile, 0)
  const totIva = righe.reduce((s, r) => s + (r.importo - r.imponibile), 0)
  const totale = righe.reduce((s, r) => s + r.importo, 0)
  const nPezzi = righe.reduce((s, r) => s + r.qta, 0)
  const resto = parseFloat(importoRicevuto || '0') - totale

  function selezionaCliente(c: any) {
    const nome = c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`.trim()
    setClienteId(c.id); setClienteNome(nome)
    setInputCliente(nome); setCercaCliente(''); setShowClienti(false)
    if (c.listino) setListino(c.listino as any)
  }

  function clearCliente() {
    setClienteId(''); setClienteNome(''); setInputCliente(''); setCercaCliente('')
  }

  async function loadDocumentiCliente(cid: string) {
    setLoadingDocs(true)
    const { data } = await supabaseAdmin.from('documenti').select('*').eq('cliente_id', cid).not('stato', 'in', '("fatturato","pagato","annullato")').order('data_documento', { ascending: false })
    setDocumentiAperti(data || [])
    setLoadingDocs(false)
  }

  async function completaVendita() {
    if (righe.length === 0) { setError('Aggiungi almeno un articolo'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const oggi = new Date().toISOString().split('T')[0]
    const anno = new Date().getFullYear()
    const { count } = await supabaseAdmin.from('documenti').select('*', { count: 'exact', head: true }).eq('tipo', 'scontrino').gte('created_at', oggi + 'T00:00:00')
    const numDoc = `CASSA-${oggi.replace(/-/g,'')}-${String((count || 0) + 1).padStart(4,'0')}`
    const statoDoc = sospeso ? 'bozza' : 'fatturato'
    const { data: doc, error: docErr } = await supabaseAdmin.from('documenti').insert([{
      user_id: uid, tipo: 'scontrino', numero_doc: numDoc, anno,
      data_documento: oggi, data_registrazione: oggi,
      cliente_id: clienteId || null, cliente_nome: clienteNome || 'Cliente generico',
      listino, metodo_pagamento: pagamento, note: note || null,
      totale_imponibile: Math.round(totImponibile * 100) / 100,
      totale_iva: Math.round(totIva * 100) / 100,
      totale_documento: Math.round(totale * 100) / 100,
      stato: statoDoc
    }]).select().single()
    if (docErr || !doc) { setError('Errore: ' + (docErr?.message || 'sconosciuto')); setSaving(false); return }
    // Righe documento
    await supabaseAdmin.from('documenti_righe').insert(righe.map((r, i) => ({
      documento_id: doc.id, user_id: uid, riga_num: i + 1,
      articolo_id: r.articolo_id, codice: r.codice, variante: r.variante,
      colore: r.colore, dis_taglia: r.dis_taglia, descrizione: r.descrizione, um: r.um,
      qta: r.qta, prezzo: r.prezzo, sconto1: r.sconto1, sconto2: 0, iva: r.iva,
      imponibile: r.imponibile, importo: r.importo
    })))
    // Contabilita mastino
    if (!sospeso && clienteId) {
      const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(1)
      const saldoPrec = lastMov?.[0]?.saldo_progressivo || 0
      await supabaseAdmin.from('mastino_clienti').insert([{
        user_id: uid, cliente_id: clienteId, cliente_nome: clienteNome,
        data_movimento: oggi, causale: `Incasso cassa ${numDoc}`,
        tipo_movimento: 'avere', importo_dare: 0, importo_avere: totale,
        saldo_progressivo: saldoPrec - totale,
        documento_id: doc.id, numero_doc: numDoc,
        metodo_pagamento: pagamento, pagato: true, data_pagamento: oggi
      }])
    } else if (sospeso && clienteId) {
      const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(1)
      const saldoPrec = lastMov?.[0]?.saldo_progressivo || 0
      await supabaseAdmin.from('mastino_clienti').insert([{
        user_id: uid, cliente_id: clienteId, cliente_nome: clienteNome,
        data_movimento: oggi, causale: `Conto sospeso ${numDoc}`,
        tipo_movimento: 'dare', importo_dare: totale, importo_avere: 0,
        saldo_progressivo: saldoPrec + totale,
        documento_id: doc.id, numero_doc: numDoc, pagato: false
      }])
    }
    setSuccess(sospeso ? `Conto sospeso: ${numDoc}` : `Incassato! ${numDoc} | Resto: EUR${Math.max(0, resto).toFixed(2)}`)
    setRighe([]); setClienteId(''); setClienteNome(''); setCercaCliente(''); setSospeso(false); setNote(''); setImportoRicevuto('')
    setSaving(false)
    setTimeout(() => { setSuccess(''); barcodeRef.current?.focus() }, 4000)
  }

  async function incassaDocumento(doc: any) {
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const oggi = new Date().toISOString().split('T')[0]
    await supabaseAdmin.from('documenti').update({ stato: 'fatturato', metodo_pagamento: pagamento }).eq('id', doc.id)
    const { data: lastMov } = await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id', doc.cliente_id).order('created_at', { ascending: false }).limit(1)
    const saldoPrec = lastMov?.[0]?.saldo_progressivo || 0
    await supabaseAdmin.from('mastino_clienti').insert([{
      user_id: uid, cliente_id: doc.cliente_id, cliente_nome: doc.cliente_nome,
      data_movimento: oggi, causale: `Incasso ${doc.numero_doc || doc.id.substring(0,8)} - ${pagamento}`,
      tipo_movimento: 'avere', importo_dare: 0, importo_avere: doc.totale_documento || 0,
      saldo_progressivo: saldoPrec - (doc.totale_documento || 0),
      documento_id: doc.id, numero_doc: doc.numero_doc,
      metodo_pagamento: pagamento, pagato: true, data_pagamento: oggi
    }])
    setSuccess(`Documento incassato!`)
    loadDocumentiCliente(doc.cliente_id)
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  const clientiFiltrati = clienti.filter(c => {
    const n = (c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`).toLowerCase()
    const q = cercaCliente.toLowerCase()
    return !q || n.includes(q) || (c.codice_cliente||'').toLowerCase().includes(q)
  }).slice(0, 8)

  const s = (bg: string, extra?: any): any => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13, ...extra })

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#f1f5f9', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      {/* SINISTRA */}
      <div style={{ width: 320, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}>
          {[['cassa','Cassa'],['incasso','Incassa Doc.']].map(([t,label])=>(
            <button key={t} onClick={()=>{setTab(t as any); if(t==='incasso'&&clienteId) loadDocumentiCliente(clienteId)}} style={{ flex:1, padding:'12px 8px', border:'none', cursor:'pointer', fontWeight:tab===t?700:400, background:tab===t?'#eff6ff':'#fff', color:tab===t?'#3b82f6':'#64748b', fontSize:13, borderBottom:tab===t?'2px solid #3b82f6':'2px solid transparent', marginBottom:-2 }}>{label}</button>
          ))}
        </div>
        {tab === 'cassa' && (
          <>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ marginBottom: 10, position: 'relative' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>CLIENTE</label>
                <div style={{ position:'relative' }}>
                  <input
                    value={inputCliente}
                    onChange={e=>{ setInputCliente(e.target.value); setCercaCliente(e.target.value); setClienteId(''); setClienteNome(''); setShowClienti(true) }}
                    onFocus={()=>setShowClienti(true)}
                    onBlur={()=>setTimeout(()=>setShowClienti(false),200)}
                    placeholder="Cerca cliente per nome o codice..."
                    style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, boxSizing:'border-box', outline:'none', paddingRight: clienteId?'28px':'10px' }}
                  />
                  {clienteId && (
                    <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'#10b981', fontSize:16, cursor:'pointer', fontWeight:700 }} onClick={clearCliente}>✓</span>
                  )}
                </div>
                {showClienti && clientiFiltrati.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, zIndex:50, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', maxHeight:200, overflowY:'auto', marginTop:2 }}>
                    {clientiFiltrati.map(c=>(
                      <div key={c.id} onMouseDown={()=>selezionaCliente(c)} style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }} onMouseEnter={e=>(e.currentTarget.style.background='#f0f9ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                        <span>{c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim()}</span>
                        {c.codice_cliente && <span style={{ fontSize:11, color:'#94a3b8' }}>{c.codice_cliente}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>LISTINO</label>
                <div style={{ display:'flex', gap:4 }}>
                  {(['base','ingrosso','promo','vip'] as const).map(l=>(
                    <button key={l} onClick={()=>setListino(l)} style={{ flex:1, padding:'6px 2px', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:listino===l?700:400, background:listino===l?'#3b82f6':'#f8fafc', color:listino===l?'#fff':'#374151', textTransform:'capitalize' }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>PAGAMENTO</label>
                <div style={{ display:'flex', gap:4 }}>
                  {(['contanti','carta','bonifico','assegno'] as const).map(p=>(
                    <button key={p} onClick={()=>setPagamento(p)} style={{ flex:1, padding:'6px 2px', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:pagamento===p?700:400, background:pagamento===p?'#10b981':'#f8fafc', color:pagamento===p?'#fff':'#374151', textTransform:'capitalize' }}>{p}</button>
                  ))}
                </div>
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:sospeso?'#f59e0b':'#64748b', fontWeight:sospeso?700:400, padding:'6px 0' }}>
                <input type="checkbox" checked={sospeso} onChange={e=>setSospeso(e.target.checked)} style={{ width:16, height:16 }}/>
                Conto Sospeso (incasso differito)
              </label>
            </div>
            <div style={{ padding:'12px 16px', background:'#1e293b' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', marginBottom:6, letterSpacing:1 }}>SCAN BARCODE / EAN</div>
              <input ref={barcodeRef} onKeyDown={handleBarcodeEnter} placeholder="Scansiona o digita EAN + INVIO..." style={{ width:'100%', background:'#334155', border:'none', borderRadius:8, padding:'10px 12px', fontSize:14, color:'#fff', boxSizing:'border-box', outline:'none' }} autoComplete="off"/>
            </div>
            <div style={{ padding:'10px 16px', flex:1, overflowY:'auto', position:'relative' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#64748b', marginBottom:6 }}>CERCA PER NOME / CODICE</div>
              <input value={cercaArt} onChange={e=>setCercaArt(e.target.value)} onFocus={()=>cercaArt&&setShowRisultati(true)} placeholder="Digita nome o codice articolo..." style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, boxSizing:'border-box', outline:'none' }} autoComplete="off"/>
              {showRisultati && risultatiArt.length > 0 && (
                <div style={{ marginTop:4, border:'1px solid #e2e8f0', borderRadius:8, overflow:'hidden', maxHeight:280, overflowY:'auto' }}>
                  {risultatiArt.map((item,i)=>{
                    const art = item.tipo==='variante' ? item._art : item
                    const prezzo = item.tipo==='variante' ? (item.prezzo_override||getPrezzoListino(art)) : getPrezzoListino(item)
                    const desc = item.tipo==='variante' ? `${art.nome}${item.colore_nome?' - '+item.colore_nome:''}${item.misura_nome?' '+item.misura_nome:''}` : item.nome
                    return (
                      <div key={i} onClick={()=>aggiungiDaRisultato(item)} style={{ padding:'9px 12px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff' }} onMouseEnter={e=>(e.currentTarget.style.background='#eff6ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{desc}</div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>{item.tipo==='variante'?`EAN: ${item.ean||'--'}`:`Cod: ${item.codice||'--'}`}</div>
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:'#10b981', marginLeft:8 }}>EUR{Number(prezzo).toFixed(2)}</div>
                      </div>
                    )
                  })}
                </div>
              )}
              <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Note..." style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:12, resize:'none', height:50, boxSizing:'border-box', outline:'none', marginTop:8 }}/>
            </div>
          </>
        )}
        {tab === 'incasso' && (
          <div style={{ flex:1, overflowY:'auto', padding:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#64748b', marginBottom:12 }}>Seleziona cliente per vedere i documenti aperti</div>
            <div style={{ position:'relative', marginBottom:12 }}>
              <div style={{ position:'relative' }}>
                <input
                  value={inputCliente}
                  onChange={e=>{ setInputCliente(e.target.value); setCercaCliente(e.target.value); setClienteId(''); setClienteNome(''); setShowClienti(true) }}
                  onFocus={()=>setShowClienti(true)}
                  onBlur={()=>setTimeout(()=>setShowClienti(false),200)}
                  placeholder="Cerca cliente..."
                  style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, boxSizing:'border-box', outline:'none', paddingRight: clienteId?'28px':'10px' }}
                />
                {clienteId && <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', color:'#10b981', fontSize:16, cursor:'pointer' }} onClick={clearCliente}>✓</span>}
              </div>
              {showClienti && clientiFiltrati.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, zIndex:50, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', maxHeight:200, overflowY:'auto', marginTop:2 }}>
                  {clientiFiltrati.map(c=>(
                    <div key={c.id} onMouseDown={()=>{selezionaCliente(c);loadDocumentiCliente(c.id)}} style={{ padding:'9px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between' }} onMouseEnter={e=>(e.currentTarget.style.background='#f0f9ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                      <span>{c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim()}</span>
                      {c.codice_cliente && <span style={{ fontSize:11, color:'#94a3b8' }}>{c.codice_cliente}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>PAGAMENTO</label>
              <div style={{ display:'flex', gap:4 }}>
                {(['contanti','carta','bonifico','assegno'] as const).map(p=>(
                  <button key={p} onClick={()=>setPagamento(p)} style={{ flex:1, padding:'5px 2px', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:pagamento===p?700:400, background:pagamento===p?'#10b981':'#f8fafc', color:pagamento===p?'#fff':'#374151', textTransform:'capitalize' }}>{p}</button>
                ))}
              </div>
            </div>
            {loadingDocs && <div style={{ color:'#94a3b8', fontSize:13 }}>Caricamento...</div>}
            {documentiAperti.length === 0 && !loadingDocs && clienteId && <div style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:20 }}>Nessun documento aperto</div>}
            {documentiAperti.map(doc=>(
              <div key={doc.id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:10, padding:14, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{doc.numero_doc || doc.id.substring(0,8)}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{doc.tipo} | {doc.data_documento}</div>
                  </div>
                  <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600 }}>{doc.stato}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:'#1e293b' }}>EUR{Number(doc.totale_documento||0).toFixed(2)}</div>
                  <button onClick={()=>incassaDocumento(doc)} disabled={saving} style={s('#10b981',{ padding:'8px 16px' })}>Incassa</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CENTRO: Scontrino */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <div style={{ background:'#1e293b', color:'#fff', padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>
            {clienteNome ? `${clienteNome}` : 'Cliente generico'} | {listino.toUpperCase()} | {pagamento.toUpperCase()}
            {sospeso && <span style={{ marginLeft:10, background:'#f59e0b', color:'#fff', padding:'2px 8px', borderRadius:4, fontSize:11 }}>SOSPESO</span>}
          </div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>{nPezzi} pz | {righe.length} righe</div>
        </div>
        {error && <div style={{ background:'#fee2e2', color:'#991b1b', padding:'8px 16px', fontSize:13 }}>{error}</div>}
        {success && <div style={{ background:'#d1fae5', color:'#065f46', padding:'8px 16px', fontSize:13, fontWeight:600 }}>{success}</div>}
        <div style={{ flex:1, overflowY:'auto' }}>
          {righe.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#94a3b8' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>🛒</div>
              <div style={{ fontSize:18, fontWeight:600 }}>Scontrino vuoto</div>
              <div style={{ fontSize:14, marginTop:6 }}>Scansiona barcode o cerca articolo a sinistra</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ position:'sticky', top:0, zIndex:10 }}>
                <tr style={{ background:'#f8fafc' }}>
                  {['#','Articolo','Cod.','Qta','Prezzo','IVA','Importo',''].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righe.map((r,i)=>(
                  <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                    <td style={{ padding:'7px 10px', fontSize:12, color:'#94a3b8', width:28 }}>{i+1}</td>
                    <td style={{ padding:'7px 10px', maxWidth:200 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.descrizione}</div>
                    </td>
                    <td style={{ padding:'7px 10px', fontSize:11, color:'#94a3b8', fontFamily:'monospace' }}>{r.codice||'--'}</td>
                    <td style={{ padding:'7px 6px', width:100 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                        <button onClick={()=>aggiornaQta(r.id,-1)} style={{ width:22, height:22, border:'1px solid #e2e8f0', borderRadius:4, cursor:'pointer', background:'#f8fafc', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>-</button>
                        <input type="number" value={r.qta} onChange={e=>setQtaDiretta(r.id,e.target.value)} style={{ width:38, textAlign:'center', border:'1px solid #e2e8f0', borderRadius:4, padding:'2px 3px', fontSize:13 }}/>
                        <button onClick={()=>aggiornaQta(r.id,1)} style={{ width:22, height:22, border:'1px solid #e2e8f0', borderRadius:4, cursor:'pointer', background:'#f8fafc', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding:'7px 6px', width:80 }}>
                      <input type="number" step="0.01" value={r.prezzo} onChange={e=>setPrezzoDiretto(r.id,e.target.value)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:13, textAlign:'right' }}/>
                    </td>
                    <td style={{ padding:'7px 10px', fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>{r.iva}%</td>
                    <td style={{ padding:'7px 10px', fontSize:14, fontWeight:700, color:'#1e293b', whiteSpace:'nowrap' }}>EUR{r.importo.toFixed(2)}</td>
                    <td style={{ padding:'7px 6px', width:28 }}>
                      <button onClick={()=>setRighe(prev=>prev.filter(x=>x.id!==r.id))} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:18, lineHeight:1, padding:0 }}>x</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* DESTRA: Totale */}
      <div style={{ width:240, background:'#fff', borderLeft:'1px solid #e2e8f0', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ flex:1, padding:'20px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ background:'#f8fafc', borderRadius:12, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:5 }}><span>Imponibile</span><span>EUR{totImponibile.toFixed(2)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:10 }}><span>IVA</span><span>EUR{totIva.toFixed(2)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:26, fontWeight:800, color:'#1e293b', borderTop:'2px solid #e2e8f0', paddingTop:10 }}><span>TOT</span><span>EUR{totale.toFixed(2)}</span></div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>IMPORTO RICEVUTO</label>
            <input type="number" step="0.01" value={importoRicevuto} onChange={e=>setImportoRicevuto(e.target.value)} placeholder="0.00" style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px', fontSize:20, fontWeight:700, textAlign:'right', boxSizing:'border-box', outline:'none' }}/>
            {importoRicevuto && (
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, padding:'8px 12px', background:resto>=0?'#d1fae5':'#fee2e2', borderRadius:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>Resto</span>
                <span style={{ fontSize:18, fontWeight:800, color:resto>=0?'#065f46':'#991b1b' }}>EUR{Math.max(0,resto).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding:16, borderTop:'1px solid #e2e8f0', display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={completaVendita} disabled={saving||righe.length===0} style={{ background:sospeso?'#f59e0b':'#10b981', color:'#fff', border:'none', borderRadius:12, padding:16, fontSize:18, fontWeight:700, cursor:'pointer', opacity:(saving||righe.length===0)?0.5:1 }}>
            {saving?'...':(sospeso?'Sospendi':'INCASSA')}
          </button>
          <button onClick={()=>{setRighe([]);setClienteId('');setClienteNome('');setCercaCliente('');setSospeso(false);setNote('');setImportoRicevuto('');setError('');setSuccess('')}} style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:10, padding:'9px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Annulla tutto
          </button>
        </div>
      </div>
    </div>
  )
}
