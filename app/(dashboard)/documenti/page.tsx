'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'

const TIPI_DOCUMENTO = {
  preventivo:    { label: 'Preventivo',          cat: 'vendita',    magazzino: null,         colore: '#3b82f6', bg: '#dbeafe' },
  ordine:        { label: 'Ordine Cliente',       cat: 'vendita',    magazzino: null,         colore: '#8b5cf6', bg: '#ede9fe' },
  ddt_vendita:   { label: 'DDT Vendita',          cat: 'vendita',    magazzino: 'scarico',    colore: '#f59e0b', bg: '#fef3c7' },
  fattura:       { label: 'Fattura',              cat: 'vendita',    magazzino: 'scarico',    colore: '#10b981', bg: '#d1fae5' },
  scontrino:     { label: 'Scontrino',            cat: 'vendita',    magazzino: 'scarico',    colore: '#06b6d4', bg: '#cffafe' },
  nota_credito:  { label: 'Nota di Credito',      cat: 'vendita',    magazzino: 'carico',     colore: '#ef4444', bg: '#fee2e2' },
  ddt_carico:    { label: 'DDT Carico',           cat: 'magazzino',  magazzino: 'carico',     colore: '#22c55e', bg: '#dcfce7' },
  ordine_forn:   { label: 'Ordine Fornitore',     cat: 'magazzino',  magazzino: null,         colore: '#64748b', bg: '#f1f5f9' },
  reso_forn:     { label: 'Reso Fornitore',       cat: 'magazzino',  magazzino: 'scarico',    colore: '#f97316', bg: '#ffedd5' },
  rettifica:     { label: 'Rettifica Inventario', cat: 'magazzino',  magazzino: 'rettifica',  colore: '#a855f7', bg: '#f3e8ff' },
  trasferimento: { label: 'Trasferimento',        cat: 'magazzino',  magazzino: 'scarico',    colore: '#0ea5e9', bg: '#e0f2fe' },
} as const

type TipoDoc = keyof typeof TIPI_DOCUMENTO

const STATI = ['bozza','aperto','confermato','sospeso','fatturato','annullato']
const STATI_COLORE: Record<string,string> = { bozza:'#e2e8f0', aperto:'#dbeafe', confermato:'#d1fae5', sospeso:'#fef3c7', fatturato:'#dcfce7', annullato:'#fee2e2' }
const STATI_TESTO: Record<string,string> = { bozza:'#64748b', aperto:'#1d4ed8', confermato:'#065f46', sospeso:'#92400e', fatturato:'#14532d', annullato:'#991b1b' }

interface RigaDoc {
  id: string; articolo_id: string|null; variante_id: string|null
  codice: string; variante: string; colore: string; dis_taglia: string
  descrizione: string; um: string; qta: number; prezzo: number
  sconto1: number; sconto2: number; iva: number; imponibile: number; importo: number
}

function calcRiga(prezzo: number, qta: number, sc1: number, sc2: number, iva: number) {
  const imp = Math.round(prezzo * qta * (1-sc1/100) * (1-sc2/100) * 100) / 100
  return { imponibile: imp, importo: Math.round(imp * (1+iva/100) * 100) / 100 }
}

const inp = (extra?: any): any => ({ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff', ...extra })
const btn = (bg: string, extra?: any): any => ({ background:bg, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600, fontSize:13, ...extra })

export default function DocumentiPage() {
  const [view, setView] = useState<'lista'|'form'>('lista')
  const [tabLista, setTabLista] = useState<'tutti'|'vendita'|'magazzino'>('tutti')
  const [documenti, setDocumenti] = useState<any[]>([])
  const [clienti, setClienti] = useState<any[]>([])
  const [articoliDB, setArticoliDB] = useState<any[]>([])
  const [variantiDB, setVariantiDB] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filtroCerca, setFiltroCerca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('tutti')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [filtroDal, setFiltroDal] = useState('')
  const [filtroAl, setFiltroAl] = useState('')
  const [editId, setEditId] = useState<string|null>(null)
  const [tipo, setTipo] = useState<TipoDoc>('preventivo')
  const [numero, setNumero] = useState('')
  const [dataDoc, setDataDoc] = useState(new Date().toISOString().split('T')[0])
  const [dataReg, setDataReg] = useState(new Date().toISOString().split('T')[0])
  const [dataConsegna, setDataConsegna] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [listino, setListino] = useState<'base'|'ingrosso'|'promo'|'vip'>('base')
  const [pagamento, setPagamento] = useState('contanti')
  const [agente, setAgente] = useState('')
  const [noteDoc, setNoteDoc] = useState('')
  const [righe, setRighe] = useState<RigaDoc[]>([])
  const [cercaCliente, setCercaCliente] = useState('')
  const [showClienti, setShowClienti] = useState(false)
  const [inputCliente, setInputCliente] = useState('')
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
    const ql = q.toLowerCase(); const risultati: any[] = []
    variantiDB.forEach(v => { if (v.ean?.toLowerCase()===ql||v.codice_variante?.toLowerCase()===ql) { const art=articoliDB.find(a=>a.id===v.articolo_id); if(art) risultati.unshift({tipo:'variante',...v,_art:art}) } })
    articoliDB.forEach(a => { if (a.ean?.toLowerCase()===ql||a.codice?.toLowerCase()===ql) { if(!risultati.find(r=>r.tipo==='articolo'&&r.id===a.id)) risultati.unshift({tipo:'articolo',...a}) } })
    articoliDB.forEach(a => { if (a.nome?.toLowerCase().includes(ql)||a.codice?.toLowerCase().includes(ql)) { if(!risultati.find(r=>r.tipo==='articolo'&&r.id===a.id)) risultati.push({tipo:'articolo',...a}) } })
    variantiDB.forEach(v => { if (v.ean?.toLowerCase().includes(ql)||v.codice_variante?.toLowerCase().includes(ql)||v.colore_nome?.toLowerCase().includes(ql)) { const art=articoliDB.find(a=>a.id===v.articolo_id); if(art&&!risultati.find(r=>r.tipo==='variante'&&r.id===v.id)) risultati.push({tipo:'variante',...v,_art:art}) } })
    setRisultatiArt(risultati.slice(0,20)); setShowRisultati(risultati.length>0)
  }, [articoliDB, variantiDB])

  useEffect(() => { const t=setTimeout(()=>eseguiRicerca(cercaArt),150); return ()=>clearTimeout(t) }, [cercaArt, eseguiRicerca])

  function aggiungiDaRisultato(item: any) {
    const isMag = TIPI_DOCUMENTO[tipo]?.cat === 'magazzino'
    let riga: RigaDoc
    if (item.tipo === 'variante') {
      const art = item._art; const prezzo = isMag ? 0 : (item.prezzo_override||getPrezzoListino(art))
      const c = calcRiga(prezzo,1,0,0,art.iva||22)
      riga = { id:crypto.randomUUID(), articolo_id:art.id, variante_id:item.id, codice:item.codice_variante||item.ean||art.codice||'', variante:item.codice_variante||'', colore:item.colore_nome||'', dis_taglia:item.misura_nome||'', descrizione:`${art.nome}${item.colore_nome?' - '+item.colore_nome:''}${item.misura_nome?' '+item.misura_nome:''}`.trim(), um:art.um||'Pz', qta:1, prezzo, sconto1:0, sconto2:0, iva:art.iva||22, ...c }
    } else {
      const prezzo = isMag ? 0 : getPrezzoListino(item); const c = calcRiga(prezzo,1,0,0,item.iva||22)
      riga = { id:crypto.randomUUID(), articolo_id:item.id, variante_id:null, codice:item.codice||item.ean||'', variante:'', colore:'', dis_taglia:'', descrizione:item.nome, um:item.um||'Pz', qta:1, prezzo, sconto1:0, sconto2:0, iva:item.iva||22, ...c }
    }
    setRighe(prev => {
      const idx = prev.findIndex(r=>r.articolo_id===riga.articolo_id&&r.variante_id===riga.variante_id)
      if (idx>=0) { const up=[...prev]; const r=up[idx]; const nq=r.qta+1; up[idx]={...r,qta:nq,...calcRiga(r.prezzo,nq,r.sconto1,r.sconto2,r.iva)}; return up }
      return [...prev, riga]
    })
    setCercaArt(''); setShowRisultati(false); setTimeout(()=>eanRef.current?.focus(),100)
  }

  function handleEanEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key!=='Enter') return
    const val=(e.target as HTMLInputElement).value.trim(); if(!val) return
    ;(e.target as HTMLInputElement).value=''
    const varMatch=variantiDB.find(v=>v.ean===val||v.codice_variante===val)
    if(varMatch){const art=articoliDB.find(a=>a.id===varMatch.articolo_id);if(art){aggiungiDaRisultato({tipo:'variante',...varMatch,_art:art});return}}
    const artMatch=articoliDB.find(a=>a.ean===val||a.codice===val)
    if(artMatch){aggiungiDaRisultato({tipo:'articolo',...artMatch});return}
    setError('Articolo non trovato: '+val); setTimeout(()=>setError(''),3000)
  }

  function aggiornaRiga(id: string, campo: keyof RigaDoc, valore: any) {
    setRighe(prev=>prev.map(r=>{if(r.id!==id)return r;const up={...r,[campo]:valore};return{...up,...calcRiga(up.prezzo,up.qta,up.sconto1,up.sconto2,up.iva)}}))
  }

  const totImponibile = righe.reduce((s,r)=>s+r.imponibile,0)
  const totIva = righe.reduce((s,r)=>s+(r.importo-r.imponibile),0)
  const totale = righe.reduce((s,r)=>s+r.importo,0)
  const nPezzi = righe.reduce((s,r)=>s+r.qta,0)

  function selezionaCliente(c: any) {
    const nome = c.ragione_sociale||`${c.nome||''} ${c.cognome||''}`.trim()
    setClienteId(c.id); setClienteNome(nome); setInputCliente(nome)
    setCercaCliente(''); setShowClienti(false); if(c.listino) setListino(c.listino as any)
  }

  async function generaNumero(t: string) {
    const anno=new Date().getFullYear()
    const p: Record<string,string>={preventivo:'PV',ordine:'OR',ddt_vendita:'DDT-V',fattura:'FT',scontrino:'SC',nota_credito:'NC',ddt_carico:'DDT-C',ordine_forn:'OF',reso_forn:'RF',rettifica:'RET',trasferimento:'TR'}
    const {count}=await supabaseAdmin.from('documenti').select('*',{count:'exact',head:true}).eq('tipo',t).gte('created_at',anno+'-01-01')
    return `${anno}-${p[t]||'DOC'}-${String((count||0)+1).padStart(5,'0')}`
  }

  async function apriNuovoDoc(tipoIniziale: TipoDoc = 'preventivo') {
    const num=await generaNumero(tipoIniziale)
    setEditId(null); setTipo(tipoIniziale); setNumero(num)
    setDataDoc(new Date().toISOString().split('T')[0]); setDataReg(new Date().toISOString().split('T')[0]); setDataConsegna('')
    setClienteId(''); setClienteNome(''); setCercaCliente(''); setInputCliente('')
    setListino('base'); setPagamento('contanti'); setAgente(''); setNoteDoc(''); setRighe([])
    setView('form'); setTimeout(()=>eanRef.current?.focus(),300)
  }

  async function apriModificaDoc(doc: any) {
    setEditId(doc.id); setTipo((doc.tipo||'preventivo') as TipoDoc); setNumero(doc.numero_doc||'')
    setDataDoc(doc.data_documento||''); setDataReg(doc.data_registrazione||''); setDataConsegna(doc.data_consegna||'')
    setClienteId(doc.cliente_id||''); setClienteNome(doc.cliente_nome||''); setInputCliente(doc.cliente_nome||'')
    setListino(doc.listino||'base'); setPagamento(doc.metodo_pagamento||'contanti'); setAgente(doc.agente||''); setNoteDoc(doc.note||'')
    const {data:righeDB}=await supabaseAdmin.from('documenti_righe').select('*').eq('documento_id',doc.id).order('riga_num')
    setRighe((righeDB||[]).map(r=>{const c=calcRiga(r.prezzo||0,r.qta||1,r.sconto1||0,r.sconto2||0,r.iva||22);return{id:r.id,articolo_id:r.articolo_id,variante_id:r.variante_id,codice:r.codice||'',variante:r.variante||'',colore:r.colore||'',dis_taglia:r.dis_taglia||'',descrizione:r.descrizione||'',um:r.um||'Pz',qta:r.qta||1,prezzo:r.prezzo||0,sconto1:r.sconto1||0,sconto2:r.sconto2||0,iva:r.iva||22,...c}}))
    setView('form')
  }

  async function salvaDocumento(statoSalvataggio: string) {
    if(righe.length===0){setError('Aggiungi almeno un articolo');return}
    const tipoInfo=TIPI_DOCUMENTO[tipo]; const isVendita=tipoInfo.cat==='vendita'
    if(isVendita&&!clienteNome&&!clienteId){setError('Seleziona un cliente');return}
    setSaving(true); setError('')
    const {data:{user}}=await supabase.auth.getUser(); const uid=user?.id||USER_ID
    const payload: any={
      user_id:uid, tipo, numero_doc:numero, data_documento:dataDoc||null, data_registrazione:dataReg||null, data_consegna:dataConsegna||null,
      cliente_id:clienteId||null, cliente_nome:clienteNome||null, listino, metodo_pagamento:pagamento, agente:agente||null,
      note:noteDoc||null, stato:statoSalvataggio,
      totale_imponibile:Math.round(totImponibile*100)/100, totale_iva:Math.round(totIva*100)/100, totale_documento:Math.round(totale*100)/100,
    }
    let docId=editId
    if(editId){
      const {error:e}=await supabaseAdmin.from('documenti').update(payload).eq('id',editId)
      if(e){setError('Errore: '+e.message);setSaving(false);return}
      await supabaseAdmin.from('documenti_righe').delete().eq('documento_id',editId)
    } else {
      const {data:doc,error:e}=await supabaseAdmin.from('documenti').insert([payload]).select().single()
      if(e||!doc){setError('Errore: '+(e?.message||'sconosciuto'));setSaving(false);return}
      docId=doc.id
    }
    await supabaseAdmin.from('documenti_righe').insert(righe.map((r,i)=>({
      documento_id:docId, user_id:uid, riga_num:i+1,
      articolo_id:r.articolo_id, variante_id:r.variante_id,
      codice:r.codice, variante:r.variante, colore:r.colore, dis_taglia:r.dis_taglia,
      descrizione:r.descrizione, um:r.um, qta:r.qta, prezzo:r.prezzo,
      sconto1:r.sconto1, sconto2:r.sconto2, iva:r.iva, imponibile:r.imponibile, importo:r.importo
    })))
    if(statoSalvataggio==='confermato'&&tipoInfo.magazzino&&!editId){
      const dir=tipoInfo.magazzino; const oggi=dataDoc||new Date().toISOString().split('T')[0]
      await supabaseAdmin.from('magazzino_movimenti').insert(righe.map(r=>({
        user_id:uid, articolo_id:r.articolo_id, variante_id:r.variante_id,
        tipo_movimento:dir==='carico'?'carico':dir==='scarico'?'scarico':'rettifica',
        qta:dir==='scarico'?-Math.abs(r.qta):Math.abs(r.qta),
        data_movimento:oggi, causale:`${tipoInfo.label} ${numero}`, documento_id:docId
      })))
    }
    if(statoSalvataggio==='confermato'&&isVendita&&clienteId&&!editId){
      const {data:lastMov}=await supabaseAdmin.from('mastino_clienti').select('saldo_progressivo').eq('cliente_id',clienteId).order('created_at',{ascending:false}).limit(1)
      const saldoPrec=lastMov?.[0]?.saldo_progressivo||0; const isNC=tipo==='nota_credito'
      await supabaseAdmin.from('mastino_clienti').insert([{
        user_id:uid, cliente_id:clienteId, cliente_nome:clienteNome,
        data_movimento:dataDoc||new Date().toISOString().split('T')[0],
        causale:`${tipoInfo.label} ${numero}`,
        tipo_movimento:isNC?'avere':'dare',
        importo_dare:isNC?0:totale, importo_avere:isNC?totale:0,
        saldo_progressivo:isNC?saldoPrec-totale:saldoPrec+totale,
        documento_id:docId, numero_doc:numero, pagato:false
      }])
    }
    setSuccess(editId?'Documento aggiornato!':'Documento salvato!'); loadAll(); setView('lista'); setSaving(false)
  }

  async function eliminaDoc(id: string) {
    if(!confirm('Eliminare questo documento?'))return
    await supabaseAdmin.from('documenti_righe').delete().eq('documento_id',id)
    await supabaseAdmin.from('documenti').delete().eq('id',id)
    loadAll()
  }

  async function cambiaStato(id: string, nuovoStato: string) {
    await supabaseAdmin.from('documenti').update({stato:nuovoStato}).eq('id',id); loadAll()
  }

  const docsFiltrati = documenti.filter(d=>{
    const ti=TIPI_DOCUMENTO[d.tipo as TipoDoc]
    const matchTab=tabLista==='tutti'||(tabLista==='vendita'&&ti?.cat==='vendita')||(tabLista==='magazzino'&&ti?.cat==='magazzino')
    const matchTipo=filtroTipo==='tutti'||d.tipo===filtroTipo
    const matchStato=filtroStato==='tutti'||d.stato===filtroStato
    const matchCerca=!filtroCerca||d.numero_doc?.toLowerCase().includes(filtroCerca.toLowerCase())||d.cliente_nome?.toLowerCase().includes(filtroCerca.toLowerCase())
    const matchDal=!filtroDal||d.data_documento>=filtroDal
    const matchAl=!filtroAl||d.data_documento<=filtroAl
    return matchTab&&matchTipo&&matchStato&&matchCerca&&matchDal&&matchAl
  })

  const clientiFiltrati=clienti.filter(c=>{const n=(c.ragione_sociale||`${c.nome||''} ${c.cognome||''}`).toLowerCase();const q=cercaCliente.toLowerCase();return !q||n.includes(q)||(c.codice_cliente||'').toLowerCase().includes(q)}).slice(0,8)
  const isMagazzinoTipo=TIPI_DOCUMENTO[tipo]?.cat==='magazzino'

  if(view==='form') return (
    <div style={{display:'flex',height:'calc(100vh - 64px)',background:'#f1f5f9',overflow:'hidden'}}>
      {/* Sinistra: testata */}
      <div style={{width:290,background:'#fff',borderRight:'1px solid #e2e8f0',overflowY:'auto',flexShrink:0}}>
        <div style={{padding:'12px 14px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:8,background:'#1e293b'}}>
          <button onClick={()=>setView('lista')} style={{background:'#334155',color:'#94a3b8',border:'none',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontSize:12}}>{'<'} Lista</button>
          <h2 style={{margin:0,fontSize:14,fontWeight:700,color:'#fff',flex:1}}>{editId?'Modifica':'Nuovo'} Documento</h2>
        </div>
        {error&&<div style={{background:'#fee2e2',color:'#991b1b',padding:'8px 14px',fontSize:12}}>{error}</div>}
        <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:'#64748b',display:'block',marginBottom:6}}>TIPO DOCUMENTO</label>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:4}}>VENDITA</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:3,marginBottom:6}}>
              {(Object.entries(TIPI_DOCUMENTO).filter(([,v])=>v.cat==='vendita') as [TipoDoc, typeof TIPI_DOCUMENTO[TipoDoc]][]).map(([k,v])=>(
                <button key={k} onClick={async()=>{setTipo(k);if(!editId){const n=await generaNumero(k);setNumero(n)}}} style={{padding:'4px 8px',border:'1px solid',borderColor:tipo===k?v.colore:'#e2e8f0',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:tipo===k?700:400,background:tipo===k?v.bg:'#f8fafc',color:tipo===k?v.colore:'#374151'}}>{v.label}</button>
              ))}
            </div>
            <div style={{fontSize:10,fontWeight:700,color:'#94a3b8',marginBottom:4}}>MAGAZZINO</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
              {(Object.entries(TIPI_DOCUMENTO).filter(([,v])=>v.cat==='magazzino') as [TipoDoc, typeof TIPI_DOCUMENTO[TipoDoc]][]).map(([k,v])=>(
                <button key={k} onClick={async()=>{setTipo(k);if(!editId){const n=await generaNumero(k);setNumero(n)}}} style={{padding:'4px 8px',border:'1px solid',borderColor:tipo===k?v.colore:'#e2e8f0',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:tipo===k?700:400,background:tipo===k?v.bg:'#f8fafc',color:tipo===k?v.colore:'#374151'}}>{v.label}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>N. DOCUMENTO</label><input style={inp()} value={numero} onChange={e=>setNumero(e.target.value)}/></div>
            <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>DATA DOC.</label><input type="date" style={inp()} value={dataDoc} onChange={e=>setDataDoc(e.target.value)}/></div>
            <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>DATA REG.</label><input type="date" style={inp()} value={dataReg} onChange={e=>setDataReg(e.target.value)}/></div>
            <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>DATA CONSEGNA</label><input type="date" style={inp()} value={dataConsegna} onChange={e=>setDataConsegna(e.target.value)}/></div>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>{isMagazzinoTipo?'FORNITORE / DEPOSITO':'CLIENTE'}</label>
            <div style={{position:'relative'}}>
              <div style={{position:'relative'}}>
                <input
                  value={inputCliente}
                  onChange={e=>{setInputCliente(e.target.value);setCercaCliente(e.target.value);setClienteId('');setClienteNome('');setShowClienti(true)}}
                  onFocus={()=>setShowClienti(true)}
                  onBlur={()=>setTimeout(()=>setShowClienti(false),200)}
                  placeholder={isMagazzinoTipo?'Fornitore (opzionale)...':'Cerca cliente per nome o codice...'}
                  style={{...inp(), paddingRight:clienteId?'28px':'10px'}}
                />
                {clienteId&&<span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',color:'#10b981',fontSize:16,cursor:'pointer',fontWeight:700}} onClick={()=>{setClienteId('');setClienteNome('');setInputCliente('');setCercaCliente('')}}>✓</span>}
              </div>
              {showClienti&&clientiFiltrati.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,zIndex:50,boxShadow:'0 4px 16px rgba(0,0,0,0.15)',maxHeight:180,overflowY:'auto',marginTop:2}}>
                  {clientiFiltrati.map(c=>(
                    <div key={c.id} onMouseDown={()=>selezionaCliente(c)} style={{padding:'8px 12px',cursor:'pointer',fontSize:13,borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between'}} onMouseEnter={e=>(e.currentTarget.style.background='#f0f9ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                      <span>{c.ragione_sociale||`${c.nome||''} ${c.cognome||''}`.trim()}</span>
                      {c.codice_cliente&&<span style={{fontSize:11,color:'#94a3b8'}}>{c.codice_cliente}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {!isMagazzinoTipo&&(
            <>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>LISTINO</label>
                <div style={{display:'flex',gap:3}}>
                  {(['base','ingrosso','promo','vip'] as const).map(l=>(
                    <button key={l} onClick={()=>setListino(l)} style={{flex:1,padding:'5px 2px',border:'1px solid #e2e8f0',borderRadius:6,cursor:'pointer',fontSize:10,fontWeight:listino===l?700:400,background:listino===l?'#3b82f6':'#f8fafc',color:listino===l?'#fff':'#374151',textTransform:'capitalize'}}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>PAGAMENTO</label>
                <select style={inp()} value={pagamento} onChange={e=>setPagamento(e.target.value)}>
                  {['contanti','carta','bonifico','assegno','riba','rimessa diretta'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>AGENTE</label><input style={inp()} value={agente} onChange={e=>setAgente(e.target.value)} placeholder="Nome agente..."/></div>
            </>
          )}
          <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:3}}>NOTE</label><textarea style={{...inp(),height:50,resize:'none'}} value={noteDoc} onChange={e=>setNoteDoc(e.target.value)} placeholder="Note documento..."/></div>
        </div>
        <div style={{padding:'12px 14px',borderTop:'1px solid #e2e8f0',background:'#f8fafc'}}>
          {!isMagazzinoTipo&&(
            <div style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginBottom:3}}><span>Imponibile</span><span>EUR {totImponibile.toFixed(2)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginBottom:5}}><span>IVA</span><span>EUR {totIva.toFixed(2)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:800,color:'#1e293b',borderTop:'2px solid #e2e8f0',paddingTop:6}}><span>TOTALE</span><span>EUR {totale.toFixed(2)}</span></div>
              <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>{nPezzi} pz | {righe.length} righe</div>
            </div>
          )}
          {isMagazzinoTipo&&(
            <div style={{marginBottom:10,padding:'8px 10px',background:'#f0fdf4',borderRadius:8,border:'1px solid #bbf7d0'}}>
              <div style={{fontSize:12,fontWeight:600,color:'#166534'}}>Movimentazione magazzino</div>
              <div style={{fontSize:11,color:'#15803d',marginTop:2}}>{nPezzi} pz | {righe.length} articoli</div>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <button onClick={()=>salvaDocumento('bozza')} disabled={saving} style={btn('#64748b',{width:'100%',padding:10})}>Salva Bozza</button>
            <button onClick={()=>salvaDocumento('confermato')} disabled={saving} style={btn('#10b981',{width:'100%',padding:10,fontSize:14})}>{saving?'Salvataggio...':'Conferma Documento'}</button>
          </div>
        </div>
      </div>

      {/* Centro: righe articoli */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>
        <div style={{background:'#1e293b',padding:'10px 16px',flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:5,letterSpacing:1}}>SCAN EAN / CODICE ARTICOLO</div>
          <input ref={eanRef} onKeyDown={handleEanEnter} placeholder="Scansiona EAN o digita codice + INVIO..." style={{width:'100%',background:'#334155',border:'none',borderRadius:8,padding:'9px 12px',fontSize:14,color:'#fff',boxSizing:'border-box',outline:'none'}} autoComplete="off"/>
        </div>
        <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'8px 16px',flexShrink:0,position:'relative'}}>
          <input value={cercaArt} onChange={e=>setCercaArt(e.target.value)} onFocus={()=>cercaArt&&setShowRisultati(true)} placeholder="Cerca per nome, codice, variante, colore..." style={{width:'100%',border:'1px solid #e2e8f0',borderRadius:8,padding:'7px 12px',fontSize:13,outline:'none',boxSizing:'border-box'}} autoComplete="off"/>
          {showRisultati&&risultatiArt.length>0&&(
            <div style={{position:'absolute',top:'100%',left:16,right:16,background:'#fff',border:'1px solid #e2e8f0',borderRadius:8,zIndex:50,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',maxHeight:280,overflowY:'auto'}}>
              {risultatiArt.map((item,i)=>{
                const art=item.tipo==='variante'?item._art:item
                const prezzo=item.tipo==='variante'?(item.prezzo_override||getPrezzoListino(art)):getPrezzoListino(item)
                const desc=item.tipo==='variante'?`${art.nome}${item.colore_nome?' - '+item.colore_nome:''}${item.misura_nome?' '+item.misura_nome:''}`:item.nome
                return(
                  <div key={i} onClick={()=>aggiungiDaRisultato(item)} style={{padding:'9px 14px',cursor:'pointer',borderBottom:'1px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fff'}} onMouseEnter={e=>(e.currentTarget.style.background='#eff6ff')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600}}>{desc}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>{item.tipo==='variante'?`EAN: ${item.ean||'--'} | Cod: ${item.codice_variante||'--'}`:`Cod: ${item.codice||'--'} | EAN: ${item.ean||'--'}`}</div>
                    </div>
                    {!isMagazzinoTipo&&<div style={{fontSize:14,fontWeight:700,color:'#10b981',marginLeft:12}}>EUR {Number(prezzo).toFixed(2)}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {righe.length===0?(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#94a3b8'}}>
              <div style={{fontSize:48,marginBottom:10}}>{'📋'}</div>
              <div style={{fontSize:16,fontWeight:600}}>Nessun articolo</div>
              <div style={{fontSize:13,marginTop:4}}>Scansiona EAN o cerca articolo sopra</div>
            </div>
          ):(
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead style={{position:'sticky',top:0,zIndex:5}}>
                <tr style={{background:'#f8fafc'}}>
                  {['#','Descrizione','Codice','UM','Qta',...(!isMagazzinoTipo?['Prezzo','Sc1%','Sc2%','IVA%','Importo']:[]),''].map(h=>(
                    <th key={h} style={{padding:'8px 10px',textAlign:'left',fontSize:11,fontWeight:600,color:'#64748b',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righe.map((r,i)=>(
                  <tr key={r.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#fff':'#fafafa'}}>
                    <td style={{padding:'6px 10px',color:'#94a3b8',fontSize:12,width:28}}>{i+1}</td>
                    <td style={{padding:'6px 10px'}}>
                      <input value={r.descrizione} onChange={e=>aggiornaRiga(r.id,'descrizione',e.target.value)} style={{border:'none',background:'transparent',fontSize:13,fontWeight:600,width:'100%',outline:'none'}}/>
                      {(r.colore||r.dis_taglia)&&<div style={{fontSize:11,color:'#94a3b8'}}>{r.colore}{r.dis_taglia?' / '+r.dis_taglia:''}</div>}
                    </td>
                    <td style={{padding:'6px 10px',fontSize:11,color:'#94a3b8',fontFamily:'monospace'}}>{r.codice||'--'}</td>
                    <td style={{padding:'6px 6px'}}><input value={r.um} onChange={e=>aggiornaRiga(r.id,'um',e.target.value)} style={{width:40,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 4px',fontSize:12,textAlign:'center'}}/></td>
                    <td style={{padding:'6px 6px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:2,justifyContent:'center'}}>
                        <button onClick={()=>aggiornaRiga(r.id,'qta',Math.max(0.1,r.qta-1))} style={{width:20,height:20,border:'1px solid #e2e8f0',borderRadius:3,cursor:'pointer',background:'#f8fafc',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>-</button>
                        <input type="number" step="0.1" value={r.qta} onChange={e=>aggiornaRiga(r.id,'qta',parseFloat(e.target.value)||1)} style={{width:42,textAlign:'center',border:'1px solid #e2e8f0',borderRadius:4,padding:'2px 3px',fontSize:13}}/>
                        <button onClick={()=>aggiornaRiga(r.id,'qta',r.qta+1)} style={{width:20,height:20,border:'1px solid #e2e8f0',borderRadius:3,cursor:'pointer',background:'#f8fafc',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>+</button>
                      </div>
                    </td>
                    {!isMagazzinoTipo&&<>
                      <td style={{padding:'6px 6px'}}><input type="number" step="0.01" value={r.prezzo} onChange={e=>aggiornaRiga(r.id,'prezzo',parseFloat(e.target.value)||0)} style={{width:72,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 5px',fontSize:13,textAlign:'right'}}/></td>
                      <td style={{padding:'6px 4px'}}><input type="number" step="0.1" value={r.sconto1} onChange={e=>aggiornaRiga(r.id,'sconto1',parseFloat(e.target.value)||0)} style={{width:44,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 4px',fontSize:12,textAlign:'center'}}/></td>
                      <td style={{padding:'6px 4px'}}><input type="number" step="0.1" value={r.sconto2} onChange={e=>aggiornaRiga(r.id,'sconto2',parseFloat(e.target.value)||0)} style={{width:44,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 4px',fontSize:12,textAlign:'center'}}/></td>
                      <td style={{padding:'6px 4px'}}><input type="number" step="1" value={r.iva} onChange={e=>aggiornaRiga(r.id,'iva',parseFloat(e.target.value)||22)} style={{width:44,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 4px',fontSize:12,textAlign:'center'}}/></td>
                      <td style={{padding:'6px 10px',fontSize:14,fontWeight:700,color:'#1e293b',textAlign:'right',whiteSpace:'nowrap'}}>EUR {r.importo.toFixed(2)}</td>
                    </>}
                    <td style={{padding:'6px 6px',width:28}}><button onClick={()=>setRighe(prev=>prev.filter(x=>x.id!==r.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:18,padding:0,lineHeight:1}}>x</button></td>
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
    <div style={{padding:'20px 24px',background:'#f1f5f9',minHeight:'100%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:'#1e293b'}}>Gestione Documenti</h1>
          <p style={{margin:'4px 0 0',fontSize:13,color:'#64748b'}}>Vendita, carico/scarico magazzino, giacenze automatiche</p>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {(['preventivo','ddt_vendita','fattura','ddt_carico','rettifica'] as TipoDoc[]).map(t=>(
            <button key={t} onClick={()=>apriNuovoDoc(t)} style={{background:TIPI_DOCUMENTO[t].bg,color:TIPI_DOCUMENTO[t].colore,border:`1px solid ${TIPI_DOCUMENTO[t].colore}`,borderRadius:8,padding:'7px 12px',cursor:'pointer',fontWeight:700,fontSize:12}}>+ {TIPI_DOCUMENTO[t].label}</button>
          ))}
        </div>
      </div>

      <div style={{display:'flex',gap:0,marginBottom:16,background:'#fff',borderRadius:10,padding:4,width:'fit-content',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        {[['tutti','Tutti'],['vendita','Vendita'],['magazzino','Magazzino']].map(([t,label])=>(
          <button key={t} onClick={()=>setTabLista(t as any)} style={{padding:'7px 18px',border:'none',cursor:'pointer',borderRadius:8,fontWeight:tabLista===t?700:400,background:tabLista===t?'#1e293b':'transparent',color:tabLista===t?'#fff':'#64748b',fontSize:13}}>{label}</button>
        ))}
      </div>

      <div style={{background:'#fff',borderRadius:12,padding:'14px 16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:2,minWidth:160}}><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>CERCA</label><input style={inp()} value={filtroCerca} onChange={e=>setFiltroCerca(e.target.value)} placeholder="Numero, cliente, fornitore..."/></div>
        <div style={{minWidth:150}}><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>TIPO</label>
          <select style={inp()} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
            <option value="tutti">Tutti i tipi</option>
            <optgroup label="VENDITA">{Object.entries(TIPI_DOCUMENTO).filter(([,v])=>v.cat==='vendita').map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</optgroup>
            <optgroup label="MAGAZZINO">{Object.entries(TIPI_DOCUMENTO).filter(([,v])=>v.cat==='magazzino').map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</optgroup>
          </select>
        </div>
        <div style={{minWidth:130}}><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>STATO</label>
          <select style={inp()} value={filtroStato} onChange={e=>setFiltroStato(e.target.value)}>
            <option value="tutti">Tutti</option>{STATI.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>
        <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>DAL</label><input type="date" style={inp({minWidth:130})} value={filtroDal} onChange={e=>setFiltroDal(e.target.value)}/></div>
        <div><label style={{fontSize:11,fontWeight:600,color:'#64748b',display:'block',marginBottom:4}}>AL</label><input type="date" style={inp({minWidth:130})} value={filtroAl} onChange={e=>setFiltroAl(e.target.value)}/></div>
        <button onClick={()=>{setFiltroCerca('');setFiltroTipo('tutti');setFiltroStato('tutti');setFiltroDal('');setFiltroAl('')}} style={btn('#94a3b8',{padding:'7px 14px',fontSize:12})}>Reset</button>
        <span style={{fontSize:12,color:'#64748b',alignSelf:'center',fontWeight:600}}>{docsFiltrati.length} doc.</span>
      </div>

      {success&&<div style={{background:'#d1fae5',color:'#065f46',padding:'10px 16px',borderRadius:8,marginBottom:12,fontSize:13,fontWeight:600}}>{success}</div>}

      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        {loading?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Caricamento...</div>:(
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
              <thead><tr style={{background:'#f8fafc'}}>
                {['Numero','Tipo','Data','Cliente / Fornitore','Listino','Pagamento','Totale','Stato','Azioni'].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:600,color:'#64748b',borderBottom:'1px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {docsFiltrati.length===0?(
                  <tr><td colSpan={9} style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Nessun documento trovato</td></tr>
                ):docsFiltrati.map(d=>{
                  const ti=TIPI_DOCUMENTO[d.tipo as TipoDoc]
                  return(
                    <tr key={d.id} style={{borderBottom:'1px solid #f1f5f9',cursor:'pointer'}} onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                      <td style={{padding:'9px 12px',fontSize:13,fontFamily:'monospace',fontWeight:700,color:'#1e293b'}}>{d.numero_doc||d.id.substring(0,8)}</td>
                      <td style={{padding:'9px 12px'}}><span style={{background:ti?.bg||'#f1f5f9',color:ti?.colore||'#64748b',padding:'3px 8px',borderRadius:5,fontSize:11,fontWeight:700}}>{ti?.label||d.tipo}</span></td>
                      <td style={{padding:'9px 12px',fontSize:13,color:'#64748b',whiteSpace:'nowrap'}}>{d.data_documento||'--'}</td>
                      <td style={{padding:'9px 12px',fontSize:13,fontWeight:500,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.cliente_nome||'--'}</td>
                      <td style={{padding:'9px 12px',fontSize:12,color:'#64748b',textTransform:'capitalize'}}>{d.listino||'--'}</td>
                      <td style={{padding:'9px 12px',fontSize:12,color:'#64748b',textTransform:'capitalize'}}>{d.metodo_pagamento||'--'}</td>
                      <td style={{padding:'9px 12px',fontSize:14,fontWeight:700,color:'#1e293b'}}>EUR {Number(d.totale_documento||0).toFixed(2)}</td>
                      <td style={{padding:'9px 12px'}}>
                        <select value={d.stato||'bozza'} onChange={e=>cambiaStato(d.id,e.target.value)} style={{background:STATI_COLORE[d.stato]||'#e2e8f0',color:STATI_TESTO[d.stato]||'#64748b',border:'none',borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                          {STATI.map(s=><option key={s} value={s}>{s.toUpperCase()}</option>)}
                        </select>
                      </td>
                      <td style={{padding:'9px 10px'}}>
                        <div style={{display:'flex',gap:4}}>
                          <button onClick={()=>apriModificaDoc(d)} style={{background:'#dbeafe',color:'#1d4ed8',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:600}}>Modifica</button>
                          <button onClick={()=>eliminaDoc(d.id)} style={{background:'#fee2e2',color:'#ef4444',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:600}}>Elimina</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
