'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

interface RigaDoc {
  id: string
  articolo_id: string | null
  variante_id: string | null
  codice: string
  descrizione: string
  um: string
  qta: number
  prezzo: number
  sconto1: number
  sconto2: number
  iva: number
  importo: number
}

function calcRiga(prezzo: number, qta: number, sc1: number, sc2: number, iva: number) {
  return Math.round(prezzo * qta * (1 - sc1/100) * (1 - sc2/100) * (1 + iva/100) * 100) / 100
}

const inp = (extra?: any): any => ({ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff', ...extra })
const btn = (bg: string, extra?: any): any => ({ background:bg, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13, ...extra })

export default function DocumentiPage() {
  const [view, setView] = useState<'lista'|'form'>('lista')
  const [documenti, setDocumenti] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [articoliDB, setArticoliDB] = useState<any[]>([])
  const [variantiDB, setVariantiDB] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Filtri lista
  const [filtroCerca, setFiltroCerca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('tutti')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  // Form documento
  const [editId, setEditId] = useState<string|null>(null)
  const [tipo, setTipo] = useState('preventivo')
  const [numero, setNumero] = useState('')
  const [dataDoc, setDataDoc] = useState(new Date().toISOString().split('T')[0])
  const [dataReg, setDataReg] = useState(new Date().toISOString().split('T')[0])
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [listino, setListino] = useState<'base'|'ingrosso'|'promo'|'vip'>('base')
  const [pagamento, setPagamento] = useState('contanti')
  const [noteDoc, setNoteDoc] = useState('')
  const [righe, setRighe] = useState<RigaDoc[]>([])
  const [cercaCliente, setCercaCliente] = useState('')
  const [showClienti, setShowClienti] = useState(false)
  const [cercaArt, setCercaArt] = useState('')
  const [risultatiArt, setRisultatiArt] = useState<any[]>([])
  const [showRisultati, setShowRisultati] = useState(false)
  const eanRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: docs }, { data: cls }, { data: arts }, { data: vars }] = await Promise.all([
      supabaseAdmin.from('documenti').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('clienti').select('id, nome, cognome, ragione_sociale, listino').order('nome'),
      supabaseAdmin.from('articoli').select('id, nome, codice, ean, prezzo_base, prezzo_ingrosso, prezzo_promo, prezzo_vip, iva, um').order('nome'),
      supabaseAdmin.from('varianti_articolo').select('id, articolo_id, colore_nome, misura_nome, ean, codice_variante, prezzo_override'),
    ])
    setDocumenti(docs || [])
    setClienti(cls || [])
    setArticoliDB(arts || [])
    setVariantiDB(vars || [])
    setLoading(false)
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
    let riga: RigaDoc
    if (item.tipo === 'variante') {
      const art = item._art
      const prezzo = item.prezzo_override || getPrezzoListino(art)
      const desc = `${art.nome} ${item.colore_nome ? '- ' + item.colore_nome : ''} ${item.misura_nome || ''}`.trim()
      riga = { id: crypto.randomUUID(), articolo_id: art.id, variante_id: item.id, codice: item.codice_variante || item.ean || art.codice || '', descrizione: desc, um: art.um || 'Pz', qta: 1, prezzo, sconto1: 0, sconto2: 0, iva: art.iva || 22, importo: calcRiga(prezzo, 1, 0, 0, art.iva || 22) }
    } else {
      const prezzo = getPrezzoListino(item)
      riga = { id: crypto.randomUUID(), articolo_id: item.id, variante_id: null, codice: item.codice || item.ean || '', descrizione: item.nome, um: item.um || 'Pz', qta: 1, prezzo, sconto1: 0, sconto2: 0, iva: item.iva || 22, importo: calcRiga(prezzo, 1, 0, 0, item.iva || 22) }
    }
    setRighe(prev => {
      const idx = prev.findIndex(r => r.articolo_id === riga.articolo_id && r.variante_id === riga.variante_id)
      if (idx >= 0) {
        const up = [...prev]; const r = up[idx]; up[idx] = { ...r, qta: r.qta + 1, importo: calcRiga(r.prezzo, r.qta + 1, r.sconto1, r.sconto2, r.iva) }; return up
      }
      return [...prev, riga]
    })
    setCercaArt(''); setShowRisultati(false)
    setTimeout(() => eanRef.current?.focus(), 100)
  }

  function handleEanEnter(e: React.KeyboardEvent<HTMLInputElement>) {
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

  function aggiornaRiga(id: string, campo: keyof RigaDoc, valore: any) {
    setRighe(prev => prev.map(r => {
      if (r.id !== id) return r
      const up = { ...r, [campo]: valore }
      up.importo = calcRiga(up.prezzo, up.qta, up.sconto1, up.sconto2, up.iva)
      return up
    }))
  }

  const totImponibile = righe.reduce((s, r) => s + r.importo / (1 + r.iva / 100), 0)
  const totIva = righe.reduce((s, r) => s + r.importo - r.importo / (1 + r.iva / 100), 0)
  const totale = righe.reduce((s, r) => s + r.importo, 0)

  function selezionaCliente(c: any) {
    setClienteId(c.id); setClienteNome(c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`.trim())
    setCercaCliente(''); setShowClienti(false)
    if (c.listino) setListino(c.listino as any)
  }

  async function generaNumero(t: string) {
    const anno = new Date().getFullYear()
    const prefisso = t === 'preventivo' ? 'PV' : t === 'ordine' ? 'OR' : t === 'ddt' ? 'DDT' : t === 'fattura' ? 'FT' : 'DOC'
    const { count } = await supabaseAdmin.from('documenti').select('*', { count: 'exact', head: true }).eq('tipo', t).gte('created_at', anno + '-01-01')
    return `${anno}-${prefisso}-${String((count || 0) + 1).padStart(5, '0')}`
  }

  async function apriNuovoDoc() {
    const num = await generaNumero('preventivo')
    setEditId(null); setTipo('preventivo'); setNumero(num)
    setDataDoc(new Date().toISOString().split('T')[0]); setDataReg(new Date().toISOString().split('T')[0])
    setClienteId(''); setClienteNome(''); setCercaCliente('')
    setListino('base'); setPagamento('contanti'); setNoteDoc(''); setRighe([])
    setView('form')
    setTimeout(() => eanRef.current?.focus(), 300)
  }

  async function apriModificaDoc(doc: any) {
    setEditId(doc.id); setTipo(doc.tipo || 'preventivo'); setNumero(doc.numero || '')
    setDataDoc(doc.data_documento || ''); setDataReg(doc.data_registrazione || '')
    setClienteId(doc.cliente_id || ''); setClienteNome(doc.cliente_nome || '')
    setListino(doc.listino || 'base'); setPagamento(doc.pagamento || 'contanti'); setNoteDoc(doc.note || '')
    const { data: righeDB } = await supabaseAdmin.from('righe_documento').select('*').eq('documento_id', doc.id).order('riga_numero')
    setRighe((righeDB || []).map(r => ({
      id: r.id, articolo_id: r.articolo_id, variante_id: r.variante_id,
      codice: r.codice || '', descrizione: r.descrizione || '', um: r.um || 'Pz',
      qta: r.qta || 1, prezzo: r.prezzo_unitario || 0, sconto1: r.sconto1 || 0, sconto2: r.sconto2 || 0,
      iva: r.iva_perc || 22, importo: r.importo_riga || 0
    })))
    setView('form')
  }

  async function salvaDocumento(statoSalvataggio: string) {
    if (!clienteNome && !clienteId) { setError('Seleziona un cliente'); return }
    if (righe.length === 0) { setError('Aggiungi almeno un articolo'); return }
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user?.id || USER_ID
    const payload: any = {
      user_id: uid, tipo, numero, data_documento: dataDoc || null, data_registrazione: dataReg || null,
      cliente_id: clienteId || null, cliente_nome: clienteNome,
      listino, pagamento, note: noteDoc || null, stato: statoSalvataggio,
      totale_imponibile: Math.round(totImponibile * 100) / 100,
      totale_iva: Math.round(totIva * 100) / 100,
      totale_documento: Math.round(totale * 100) / 100,
    }
    let docId = editId
    if (editId) {
      const { error: e } = await supabaseAdmin.from('documenti').update(payload).eq('id', editId)
      if (e) { setError('Errore: ' + e.message); setSaving(false); return }
      await supabaseAdmin.from('righe_documento').delete().eq('documento_id', editId)
    } else {
      const { data: doc, error: e } = await supabaseAdmin.from('documenti').insert([payload]).select().single()
      if (e || !doc) { setError('Errore: ' + (e?.message || '')); setSaving(false); return }
      docId = doc.id
    }
    // Salva righe
    await supabaseAdmin.from('righe_documento').insert(righe.map((r, i) => ({
      documento_id: docId, user_id: uid, riga_num: i + 1,
      articolo_id: r.articolo_id, variante_id: r.variante_id,
      codice: r.codice, descrizione: r.descrizione, um: r.um,
      qta: r.qta, prezzo: r.prezzo, sconto1: r.sconto1, sconto2: r.sconto2, iva_perc: r.iva,
      importo: r.importo
    })))
    // Se confermato: crea movimento dare nel mastino (credito verso cliente)
    if (statoSalvataggio === 'confermato' && clienteId && !editId) {
      await supabaseAdmin.from('mastino_clienti').insert([{
        user_id: uid, cliente_id: clienteId, cliente_nome: clienteNome,
        data_movimento: dataDoc || new Date().toISOString().split('T')[0],
        tipo_movimento: 'dare', descrizione: `${tipo.toUpperCase()} ${numero}`,
        importo_dare: totale, importo_avere: 0, documento_id: docId, numero_doc: numero
      }])
    }
    setSuccess(editId ? 'Documento aggiornato!' : 'Documento salvato!')
    loadAll(); setView('lista')
    setSaving(false)
  }

  async function eliminaDoc(id: string) {
    if (!confirm('Eliminare questo documento?')) return
    await supabaseAdmin.from('righe_documento').delete().eq('documento_id', id)
    await supabaseAdmin.from('documenti').delete().eq('id', id)
    loadAll()
  }

  const docsFiltrati = documenti.filter(d => {
    const matchTipo = filtroTipo === 'tutti' || d.tipo === filtroTipo
    const matchStato = filtroStato === 'tutti' || d.stato === filtroStato
    const matchCerca = !filtroCerca || d.numero?.toLowerCase().includes(filtroCerca.toLowerCase()) || d.cliente_nome?.toLowerCase().includes(filtroCerca.toLowerCase())
    const matchDal = !filtroDal || d.data_documento >= filtroDal
    const matchAl = !filtroAl || d.data_documento <= filtroAl
    return matchTipo && matchStato && matchCerca && matchDal && matchAl
  })

  const statoColor: Record<string, string> = { bozza:'#e2e8f0', aperto:'#dbeafe', confermato:'#d1fae5', sospeso:'#fef3c7', incassato:'#dcfce7', annullato:'#fee2e2' }
  const statoTextColor: Record<string, string> = { bozza:'#64748b', aperto:'#1d4ed8', confermato:'#065f46', sospeso:'#92400e', incassato:'#14532d', annullato:'#991b1b' }
  const clientiFiltrati = clienti.filter(c => { const n = (c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`).toLowerCase(); return n.includes(cercaCliente.toLowerCase()) }).slice(0, 8)

  if (view === 'form') return (
    <div style={{ display:'flex', height:'calc(100vh - 64px)', background:'#f1f5f9', overflow:'hidden' }}>
      {/* Sinistra: form testata */}
      <div style={{ width:300, background:'#fff', borderRight:'1px solid #e2e8f0', overflowY:'auto', flexShrink:0 }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>setView('lista')} style={btn('#64748b',{ padding:'6px 12px', fontSize:12 })}>← Indietro</button>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700 }}>{editId?'Modifica':'Nuovo'} Documento</h2>
        </div>
        {error && <div style={{ background:'#fee2e2', color:'#991b1b', padding:'10px 14px', fontSize:12 }}>{error} <button onClick={()=>setError('')} style={{ background:'none', border:'none', cursor:'pointer', float:'right' }}>×</button></div>}
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {/* Tipo */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>TIPO DOCUMENTO</label>
            <select style={inp()} value={tipo} onChange={async e=>{setTipo(e.target.value);if(!editId){const n=await generaNumero(e.target.value);setNumero(n)}}}>
              {['preventivo','ordine','ddt','fattura','nota_credito','scontrino'].map(t=><option key={t} value={t}>{t.replace('_',' ').toUpperCase()}</option>)}
            </select>
          </div>
          {/* Numero */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>NUMERO DOCUMENTO</label>
            <input style={inp()} value={numero} onChange={e=>setNumero(e.target.value)} placeholder="Auto-generato"/>
          </div>
          {/* Date */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div><label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>DATA DOC.</label><input type="date" style={inp()} value={dataDoc} onChange={e=>setDataDoc(e.target.value)}/></div>
            <div><label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>DATA REG.</label><input type="date" style={inp()} value={dataReg} onChange={e=>setDataReg(e.target.value)}/></div>
          </div>
          {/* Cliente */}
          <div style={{ position:'relative' }}>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>CLIENTE *</label>
            <input value={clienteNome||cercaCliente} onChange={e=>{setCercaCliente(e.target.value);setClienteId('');setClienteNome('');setShowClienti(true)}} onFocus={()=>setShowClienti(true)} placeholder="Cerca cliente..." style={inp()}/>
            {showClienti && cercaCliente && clientiFiltrati.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, zIndex:50, boxShadow:'0 4px 16px rgba(0,0,0,0.1)', maxHeight:180, overflowY:'auto' }}>
                {clientiFiltrati.map(c=>(
                  <div key={c.id} onClick={()=>selezionaCliente(c)} style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, borderBottom:'1px solid #f1f5f9' }} onMouseEnter={e=>(e.currentTarget.style.background='#f0f9ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                    {c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim()}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Listino */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>LISTINO</label>
            <div style={{ display:'flex', gap:4 }}>
              {(['base','ingrosso','promo','vip'] as const).map(l=>(
                <button key={l} onClick={()=>setListino(l)} style={{ flex:1, padding:'5px 2px', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer', fontSize:11, fontWeight:listino===l?700:400, background:listino===l?'#3b82f6':'#f8fafc', color:listino===l?'#fff':'#374151', textTransform:'capitalize' }}>{l}</button>
              ))}
            </div>
          </div>
          {/* Pagamento */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>PAGAMENTO</label>
            <select style={inp()} value={pagamento} onChange={e=>setPagamento(e.target.value)}>
              {['contanti','carta','bonifico','assegno','riba','rimessa diretta'].map(p=><option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          {/* Note */}
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>NOTE</label>
            <textarea style={{ ...inp(), height:60, resize:'vertical' }} value={noteDoc} onChange={e=>setNoteDoc(e.target.value)} placeholder="Note documento..."/>
          </div>
          {/* Totali */}
          <div style={{ background:'#f8fafc', borderRadius:10, padding:12, marginTop:4 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:4 }}><span>Imponibile</span><span>€{totImponibile.toFixed(2)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:8 }}><span>IVA</span><span>€{totIva.toFixed(2)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:800, color:'#1e293b', borderTop:'1px solid #e2e8f0', paddingTop:8 }}><span>TOTALE</span><span>€{totale.toFixed(2)}</span></div>
          </div>
          {/* Bottoni salvataggio */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <button onClick={()=>salvaDocumento('bozza')} disabled={saving} style={btn('#64748b',{ padding:'10px' })}>💾 Salva Bozza</button>
            <button onClick={()=>salvaDocumento('confermato')} disabled={saving} style={btn('#3b82f6',{ padding:'10px' })}>✓ Conferma Documento</button>
          </div>
        </div>
      </div>

      {/* Destra: righe documento */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Barra ricerca articolo */}
        <div style={{ background:'#1e293b', padding:'10px 16px', display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
          <div style={{ flex:1, position:'relative' }}>
            <input ref={eanRef} onKeyDown={handleEanEnter} placeholder="Scan EAN / Codice + INVIO per aggiungere..." style={{ width:'100%', background:'#334155', border:'none', borderRadius:8, padding:'9px 12px', fontSize:13, color:'#fff', boxSizing:'border-box', outline:'none' }} autoComplete="off"/>
          </div>
          <div style={{ flex:2, position:'relative' }}>
            <input value={cercaArt} onChange={e=>setCercaArt(e.target.value)} onFocus={()=>cercaArt&&setShowRisultati(true)} placeholder="Cerca per nome, codice, EAN..." style={{ width:'100%', background:'#334155', border:'none', borderRadius:8, padding:'9px 12px', fontSize:13, color:'#fff', boxSizing:'border-box', outline:'none' }} autoComplete="off"/>
            {showRisultati && risultatiArt.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, zIndex:100, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', maxHeight:300, overflowY:'auto' }}>
                {risultatiArt.map((item,i)=>{
                  const art = item.tipo==='variante' ? item._art : item
                  const prezzo = item.tipo==='variante' ? (item.prezzo_override||getPrezzoListino(art)) : getPrezzoListino(item)
                  const desc = item.tipo==='variante' ? `${art.nome} ${item.colore_nome?'- '+item.colore_nome:''} ${item.misura_nome||''}`.trim() : item.nome
                  return (
                    <div key={i} onClick={()=>aggiungiDaRisultato(item)} style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }} onMouseEnter={e=>(e.currentTarget.style.background='#eff6ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600 }}>{desc}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{item.tipo==='variante'?`EAN: ${item.ean||'--'}`:`Cod: ${item.codice||'--'} | EAN: ${item.ean||'--'}`}</div>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:'#10b981', marginLeft:12 }}>€{Number(prezzo).toFixed(2)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div style={{ color:'#94a3b8', fontSize:12, whiteSpace:'nowrap' }}>{righe.length} righe</div>
        </div>

        {/* Tabella righe */}
        <div style={{ flex:1, overflowY:'auto', background:'#fff' }}>
          {righe.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#94a3b8' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:16, fontWeight:600 }}>Nessuna riga</div>
              <div style={{ fontSize:13, marginTop:4 }}>Scansiona EAN o cerca articolo nella barra sopra</div>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead style={{ position:'sticky', top:0, zIndex:10 }}>
                <tr style={{ background:'#f8fafc' }}>
                  {['#','Codice','Descrizione','UM','Qta','Prezzo','Sc1%','Sc2%','IVA%','Importo',''].map(h=>(
                    <th key={h} style={{ padding:'8px 8px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righe.map((r,i)=>(
                  <tr key={r.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                    <td style={{ padding:'6px 8px', fontSize:12, color:'#94a3b8', width:24 }}>{i+1}</td>
                    <td style={{ padding:'6px 8px', width:90 }}><input value={r.codice} onChange={e=>aggiornaRiga(r.id,'codice',e.target.value)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:12, fontFamily:'monospace' }}/></td>
                    <td style={{ padding:'6px 8px', minWidth:180 }}><input value={r.descrizione} onChange={e=>aggiornaRiga(r.id,'descrizione',e.target.value)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:13 }}/></td>
                    <td style={{ padding:'6px 8px', width:50 }}><input value={r.um} onChange={e=>aggiornaRiga(r.id,'um',e.target.value)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:12, textAlign:'center' }}/></td>
                    <td style={{ padding:'6px 8px', width:70 }}><input type="number" step="0.01" value={r.qta} onChange={e=>aggiornaRiga(r.id,'qta',parseFloat(e.target.value)||0)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:13, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 8px', width:80 }}><input type="number" step="0.01" value={r.prezzo} onChange={e=>aggiornaRiga(r.id,'prezzo',parseFloat(e.target.value)||0)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:13, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 8px', width:55 }}><input type="number" step="0.1" value={r.sconto1} onChange={e=>aggiornaRiga(r.id,'sconto1',parseFloat(e.target.value)||0)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:12, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 8px', width:55 }}><input type="number" step="0.1" value={r.sconto2} onChange={e=>aggiornaRiga(r.id,'sconto2',parseFloat(e.target.value)||0)} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 5px', fontSize:12, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 8px', width:55 }}><select value={r.iva} onChange={e=>aggiornaRiga(r.id,'iva',Number(e.target.value))} style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:4, padding:'3px 4px', fontSize:12 }}>{[0,4,5,10,22].map(v=><option key={v} value={v}>{v}%</option>)}</select></td>
                    <td style={{ padding:'6px 8px', fontSize:14, fontWeight:700, color:'#1e293b', whiteSpace:'nowrap', width:90 }}>€{r.importo.toFixed(2)}</td>
                    <td style={{ padding:'6px 6px', width:28 }}><button onClick={()=>setRighe(prev=>prev.filter(x=>x.id!==r.id))} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:18, lineHeight:1, padding:0 }}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )

  // LISTA DOCUMENTI
  return (
    <div style={{ padding:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Gestione Documenti</h1>
          <p style={{ margin:0, fontSize:13, color:'#64748b' }}>Preventivi, Ordini, DDT, Fatture</p>
        </div>
        <button onClick={apriNuovoDoc} style={btn('#3b82f6',{ padding:'10px 20px', fontSize:14 })}>+ Nuovo Documento</button>
      </div>
      {success && <div style={{ background:'#d1fae5', color:'#065f46', padding:'10px 16px', borderRadius:8, marginBottom:16, fontSize:13 }}>{success}</div>}
      {/* Filtri */}
      <div style={{ background:'#fff', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ flex:2, minWidth:160 }}><label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>CERCA</label><input style={inp()} value={filtroCerca} onChange={e=>setFiltroCerca(e.target.value)} placeholder="Numero, cliente..."/></div>
        <div style={{ minWidth:130 }}><label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>TIPO</label><select style={inp()} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}><option value="tutti">Tutti</option>{['preventivo','ordine','ddt','fattura','scontrino','nota_credito'].map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}</select></div>
        <div style={{ minWidth:130 }}><label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>STATO</label><select style={inp()} value={filtroStato} onChange={e=>setFiltroStato(e.target.value)}><option value="tutti">Tutti</option>{['bozza','aperto','confermato','sospeso','incassato','annullato'].map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}</select></div>
        <div><label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>DAL</label><input type="date" style={inp({minWidth:130})} value={filtroDal} onChange={e=>setFiltroDal(e.target.value)}/></div>
        <div><label style={{ fontSize:11, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>AL</label><input type="date" style={inp({minWidth:130})} value={filtroAl} onChange={e=>setFiltroAl(e.target.value)}/></div>
        <button onClick={()=>{setFiltroCerca('');setFiltroTipo('tutti');setFiltroStato('tutti');setFiltroDal('');setFiltroAl('')}} style={btn('#94a3b8',{ padding:'7px 14px', fontSize:12 })}>Reset</button>
        <span style={{ fontSize:12, color:'#64748b', alignSelf:'center' }}>{docsFiltrati.length} doc.</span>
      </div>
      {/* Tabella */}
      <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Caricamento...</div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8fafc' }}>
              {['Numero','Tipo','Data','Cliente','Listino','Pagamento','Totale','Stato','Azioni'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {docsFiltrati.length === 0 ? <tr><td colSpan={9} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Nessun documento trovato</td></tr> : docsFiltrati.map(d=>(
                <tr key={d.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', fontWeight:600 }}>{d.numero || d.id.substring(0,8)}</td>
                  <td style={{ padding:'9px 12px', fontSize:12 }}><span style={{ background:'#eff6ff', color:'#1d4ed8', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>{(d.tipo||'').toUpperCase()}</span></td>
                  <td style={{ padding:'9px 12px', fontSize:13, color:'#64748b', whiteSpace:'nowrap' }}>{d.data_documento || '--'}</td>
                  <td style={{ padding:'9px 12px', fontSize:13, fontWeight:500 }}>{d.cliente_nome || '--'}</td>
                  <td style={{ padding:'9px 12px', fontSize:12, color:'#64748b' }}>{d.listino || '--'}</td>
                  <td style={{ padding:'9px 12px', fontSize:12, color:'#64748b' }}>{d.pagamento || '--'}</td>
                  <td style={{ padding:'9px 12px', fontSize:14, fontWeight:700 }}>€{Number(d.totale||0).toFixed(2)}</td>
                  <td style={{ padding:'9px 12px' }}><span style={{ background:statoColor[d.stato]||'#e2e8f0', color:statoTextColor[d.stato]||'#64748b', padding:'3px 8px', borderRadius:6, fontSize:11, fontWeight:600 }}>{(d.stato||'').toUpperCase()}</span></td>
                  <td style={{ padding:'9px 10px' }}>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={()=>apriModificaDoc(d)} style={{ background:'#dbeafe', color:'#1d4ed8', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>Modifica</button>
                      <button onClick={()=>eliminaDoc(d.id)} style={{ background:'#fee2e2', color:'#ef4444', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>Elimina</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
