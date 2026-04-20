'use client'
import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

const USER_ID = 'f1e0512f-0ecd-41b5-a29a-33fc9f832528'
const inp = (extra?: any): any => ({ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', ...extra })
const btn = (bg: string, extra?: any): any => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14, ...extra })

// Usa i campi reali della tabella articoli esistente
const emptyForm = {
  nome: '', codice: '', ean: '', categoria_id: '',
  prezzo_base: 0, prezzo_ingrosso: 0, prezzo_promo: 0, prezzo_vip: 0,
  iva: 22, um: 'Pz', stock: 0, descrizione: '', stato: 'attivo',
  costo: 0, categoria: ''
}

export default function ArticoliPage() {
  const [articoli, setArticoli] = useState<any[]>([])
  const [categorie, setCategorie] = useState<any[]>([])
  const [colori, setColori] = useState<any[]>([])
  const [misure, setMisure] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'lista'|'form'|'varianti'|'tabelle'>('lista')
  const [form, setForm] = useState({...emptyForm})
  const [editId, setEditId] = useState<string|null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [cerca, setCerca] = useState('')
  const [filtroCat, setFiltroCat] = useState('tutti')
  const [articoloVarianti, setArticoloVarianti] = useState<any>(null)
  const [varianti, setVarianti] = useState<any[]>([])
  const [tab, setTab] = useState<'info'|'listini'>('info')
  const [tabTabelle, setTabTabelle] = useState<'colori'|'misure'|'categorie'>('colori')
  const [nuovoColore, setNuovoColore] = useState({ nome: '', codice_hex: '#000000' })
  const [nuovaMisura, setNuovaMisura] = useState({ nome: '', categoria: 'taglia', ordine: 0 })
  const [nuovaCategoria, setNuovaCategoria] = useState({ nome: '', descrizione: '' })
  const [varianteForm, setVarianteForm] = useState({ colore_id: '', misura_id: '', ean: '', codice_variante: '', prezzo_override: '', stock: 0 })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: arts }, { data: cats }, { data: cols }, { data: mis }] = await Promise.all([
      supabaseAdmin.from('articoli').select('*').order('nome'),
      supabaseAdmin.from('categorie_prodotto').select('*').order('nome'),
      supabaseAdmin.from('colori').select('*').order('nome'),
      supabaseAdmin.from('misure').select('*').order('ordine, nome'),
    ])
    setArticoli(arts || [])
    setCategorie(cats || [])
    setColori(cols || [])
    setMisure(mis || [])
    setLoading(false)
  }

  async function salvaArticolo() {
    if (!form.nome.trim()) { setError('Il nome e obbligatorio'); return }
    setSaving(true); setError(''); setSuccess('')
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      nome: form.nome, codice: form.codice || null, ean: form.ean || null,
      categoria_id: form.categoria_id || null, categoria: form.categoria || null,
      prezzo_base: Number(form.prezzo_base) || 0,
      prezzo_ingrosso: Number(form.prezzo_ingrosso) || 0,
      prezzo_promo: Number(form.prezzo_promo) || 0,
      prezzo_vip: Number(form.prezzo_vip) || 0,
      iva: Number(form.iva) || 22,
      um: form.um || 'Pz',
      stock: Number(form.stock) || 0,
      costo: Number(form.costo) || 0,
      descrizione: form.descrizione || null,
      stato: form.stato || 'attivo',
      user_id: user?.id || USER_ID,
    }
    const result = editId
      ? await supabaseAdmin.from('articoli').update(payload).eq('id', editId)
      : await supabaseAdmin.from('articoli').insert([payload])
    if (result.error) { setError('Errore: ' + result.error.message) }
    else { setSuccess(editId ? 'Articolo aggiornato!' : 'Articolo salvato!'); setView('lista'); setForm({...emptyForm}); setEditId(null); loadAll() }
    setSaving(false)
  }

  async function eliminaArticolo(id: string) {
    if (!confirm('Eliminare questo articolo?')) return
    const { error } = await supabaseAdmin.from('articoli').delete().eq('id', id)
    if (error) setError('Errore: ' + error.message)
    else { setSuccess('Eliminato'); loadAll() }
  }

  async function apriVarianti(art: any) {
    setArticoloVarianti(art)
    const { data } = await supabaseAdmin.from('varianti_articolo').select('*, colori(nome, codice_hex), misure(nome)').eq('articolo_id', art.id).order('created_at')
    setVarianti(data || [])
    setVarianteForm({ colore_id: '', misura_id: '', ean: '', codice_variante: '', prezzo_override: '', stock: 0 })
    setView('varianti')
  }

  async function salvaVariante() {
    if (!varianteForm.colore_id && !varianteForm.misura_id) { setError('Seleziona almeno colore o misura'); return }
    setSaving(true); setError('')
    const colore = colori.find(c => c.id === varianteForm.colore_id)
    const misura = misure.find(m => m.id === varianteForm.misura_id)
    const payload = {
      articolo_id: articoloVarianti.id,
      colore_id: varianteForm.colore_id || null,
      misura_id: varianteForm.misura_id || null,
      colore_nome: colore?.nome || null,
      misura_nome: misura?.nome || null,
      ean: varianteForm.ean || null,
      codice_variante: varianteForm.codice_variante || null,
      prezzo_override: varianteForm.prezzo_override ? Number(varianteForm.prezzo_override) : null,
      stock: Number(varianteForm.stock) || 0
    }
    const { error } = await supabaseAdmin.from('varianti_articolo').insert([payload])
    if (error) { setError('Errore: ' + error.message) }
    else { setSuccess('Variante aggiunta!'); setVarianteForm({ colore_id: '', misura_id: '', ean: '', codice_variante: '', prezzo_override: '', stock: 0 }); apriVarianti(articoloVarianti) }
    setSaving(false)
  }

  async function eliminaVariante(id: string) {
    if (!confirm('Eliminare?')) return
    await supabaseAdmin.from('varianti_articolo').delete().eq('id', id)
    apriVarianti(articoloVarianti)
  }

  async function salvaColore() {
    if (!nuovoColore.nome.trim()) return
    const { error } = await supabaseAdmin.from('colori').insert([nuovoColore])
    if (!error) { setNuovoColore({ nome: '', codice_hex: '#000000' }); loadAll(); setSuccess('Colore aggiunto!') } else setError(error.message)
  }
  async function salvaMisura() {
    if (!nuovaMisura.nome.trim()) return
    const { error } = await supabaseAdmin.from('misure').insert([{ ...nuovaMisura, ordine: Number(nuovaMisura.ordine) }])
    if (!error) { setNuovaMisura({ nome: '', categoria: 'taglia', ordine: 0 }); loadAll(); setSuccess('Misura aggiunta!') } else setError(error.message)
  }
  async function salvaCategoria() {
    if (!nuovaCategoria.nome.trim()) return
    const { error } = await supabaseAdmin.from('categorie_prodotto').insert([nuovaCategoria])
    if (!error) { setNuovaCategoria({ nome: '', descrizione: '' }); loadAll(); setSuccess('Categoria aggiunta!') } else setError(error.message)
  }

  const artFiltrati = articoli.filter(a => {
    const matchCat = filtroCat === 'tutti' || a.categoria_id === filtroCat || a.categoria === filtroCat
    const matchCerca = !cerca || a.nome?.toLowerCase().includes(cerca.toLowerCase()) || a.codice?.toLowerCase().includes(cerca.toLowerCase()) || a.ean?.includes(cerca)
    return matchCat && matchCerca
  })

  const Err = () => error ? <div style={{background:'#fee2e2',color:'#991b1b',padding:12,borderRadius:8,marginBottom:12}}>{error} <button onClick={()=>setError('')} style={{background:'none',border:'none',cursor:'pointer',float:'right'}}>x</button></div> : null
  const Suc = () => success ? <div style={{background:'#d1fae5',color:'#065f46',padding:12,borderRadius:8,marginBottom:12}}>{success}</div> : null

  if (view === 'tabelle') return (
    <div style={{padding:24,maxWidth:900,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <button onClick={()=>setView('lista')} style={btn('#64748b')}>Indietro</button>
        <h1 style={{margin:0,fontSize:22,fontWeight:700}}>Tabelle di Base</h1>
      </div>
      <Err/><Suc/>
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {(['colori','misure','categorie'] as const).map(t=>(
          <button key={t} onClick={()=>setTabTabelle(t)} style={{...btn(tabTabelle===t?'#3b82f6':'#e2e8f0'),color:tabTabelle===t?'#fff':'#374151',textTransform:'capitalize'}}>{t}</button>
        ))}
      </div>
      {tabTabelle==='colori' && (
        <div>
          <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',marginBottom:20}}>
            <h3 style={{margin:'0 0 12px',fontSize:16}}>Aggiungi Colore</h3>
            <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:150}}><label style={{fontSize:12,color:'#64748b'}}>Nome colore</label><input style={inp()} value={nuovoColore.nome} onChange={e=>setNuovoColore(p=>({...p,nome:e.target.value}))} placeholder="es. Azzurro cielo"/></div>
              <div><label style={{fontSize:12,color:'#64748b'}}>Colore</label><input type="color" value={nuovoColore.codice_hex} onChange={e=>setNuovoColore(p=>({...p,codice_hex:e.target.value}))} style={{width:50,height:38,border:'1px solid #e2e8f0',borderRadius:8,cursor:'pointer'}}/></div>
              <button onClick={salvaColore} style={btn('#10b981')}>+ Aggiungi</button>
            </div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            {colori.map(c=>(
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,background:'#fff',borderRadius:8,padding:'8px 14px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <div style={{width:20,height:20,borderRadius:4,background:c.codice_hex,border:'1px solid #e2e8f0'}}/>
                <span style={{fontSize:14,fontWeight:500}}>{c.nome}</span>
                <button onClick={async()=>{await supabaseAdmin.from('colori').delete().eq('id',c.id);loadAll()}} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:16}}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tabTabelle==='misure' && (
        <div>
          <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',marginBottom:20}}>
            <h3 style={{margin:'0 0 12px',fontSize:16}}>Aggiungi Misura/Taglia</h3>
            <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:100}}><label style={{fontSize:12,color:'#64748b'}}>Nome</label><input style={inp()} value={nuovaMisura.nome} onChange={e=>setNuovaMisura(p=>({...p,nome:e.target.value}))} placeholder="es. 42 oppure XL"/></div>
              <div style={{minWidth:120}}><label style={{fontSize:12,color:'#64748b'}}>Categoria</label><select style={inp()} value={nuovaMisura.categoria} onChange={e=>setNuovaMisura(p=>({...p,categoria:e.target.value}))}><option value="taglia">Taglia (S/M/L)</option><option value="numero">Numero (38/40)</option><option value="misura">Misura (cm)</option><option value="unico">Unico</option></select></div>
              <div style={{width:80}}><label style={{fontSize:12,color:'#64748b'}}>Ordine</label><input type="number" style={inp()} value={nuovaMisura.ordine} onChange={e=>setNuovaMisura(p=>({...p,ordine:Number(e.target.value)}))}/></div>
              <button onClick={salvaMisura} style={btn('#10b981')}>+ Aggiungi</button>
            </div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {misure.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,background:'#fff',borderRadius:8,padding:'8px 14px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <span style={{fontSize:13,color:'#64748b'}}>{m.categoria}</span>
                <span style={{fontSize:14,fontWeight:600}}>{m.nome}</span>
                <button onClick={async()=>{await supabaseAdmin.from('misure').delete().eq('id',m.id);loadAll()}} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:16}}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {tabTabelle==='categorie' && (
        <div>
          <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',marginBottom:20}}>
            <h3 style={{margin:'0 0 12px',fontSize:16}}>Aggiungi Categoria Prodotto</h3>
            <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:150}}><label style={{fontSize:12,color:'#64748b'}}>Nome categoria</label><input style={inp()} value={nuovaCategoria.nome} onChange={e=>setNuovaCategoria(p=>({...p,nome:e.target.value}))} placeholder="es. Lenzuola"/></div>
              <div style={{flex:2,minWidth:200}}><label style={{fontSize:12,color:'#64748b'}}>Descrizione</label><input style={inp()} value={nuovaCategoria.descrizione} onChange={e=>setNuovaCategoria(p=>({...p,descrizione:e.target.value}))} placeholder="Descrizione opzionale"/></div>
              <button onClick={salvaCategoria} style={btn('#10b981')}>+ Aggiungi</button>
            </div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {categorie.map(c=>(
              <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,background:'#fff',borderRadius:8,padding:'8px 14px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                <span style={{fontSize:14,fontWeight:600}}>{c.nome}</span>
                <button onClick={async()=>{await supabaseAdmin.from('categorie_prodotto').delete().eq('id',c.id);loadAll()}} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:16}}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (view === 'varianti') return (
    <div style={{padding:24,maxWidth:1000,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <button onClick={()=>setView('lista')} style={btn('#64748b')}>Indietro</button>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:700}}>Varianti: {articoloVarianti?.nome}</h1>
          <p style={{margin:0,fontSize:13,color:'#64748b'}}>Prezzo base: euro{Number(articoloVarianti?.prezzo_base||0).toFixed(2)} - Codice: {articoloVarianti?.codice||'--'}</p>
        </div>
      </div>
      <Err/><Suc/>
      <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',marginBottom:24}}>
        <h3 style={{margin:'0 0 16px',fontSize:16}}>+ Aggiungi Variante</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))',gap:12}}>
          <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Colore</label><select style={inp()} value={varianteForm.colore_id} onChange={e=>setVarianteForm(p=>({...p,colore_id:e.target.value}))}><option value="">-- Nessuno --</option>{colori.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Misura/Taglia</label><select style={inp()} value={varianteForm.misura_id} onChange={e=>setVarianteForm(p=>({...p,misura_id:e.target.value}))}><option value="">-- Nessuna --</option>{misure.map(m=><option key={m.id} value={m.id}>{m.nome} ({m.categoria})</option>)}</select></div>
          <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>EAN / Barcode</label><input style={inp()} value={varianteForm.ean} onChange={e=>setVarianteForm(p=>({...p,ean:e.target.value}))} placeholder="Scansiona o digita EAN"/></div>
          <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Codice Variante</label><input style={inp()} value={varianteForm.codice_variante} onChange={e=>setVarianteForm(p=>({...p,codice_variante:e.target.value}))} placeholder="es. ART001-BLU-M"/></div>
          <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Prezzo (opz.)</label><input type="number" step="0.01" style={inp()} value={varianteForm.prezzo_override} onChange={e=>setVarianteForm(p=>({...p,prezzo_override:e.target.value}))} placeholder={"Base: euro"+articoloVarianti?.prezzo_base}/></div>
          <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Stock</label><input type="number" style={inp()} value={varianteForm.stock} onChange={e=>setVarianteForm(p=>({...p,stock:Number(e.target.value)}))}/></div>
        </div>
        <div style={{marginTop:16}}><button onClick={salvaVariante} disabled={saving} style={btn('#10b981',{padding:'10px 28px'})}>{saving?'Salvataggio...':'+ Aggiungi Variante'}</button></div>
      </div>
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc'}}>{['Colore','Misura','EAN','Codice','Prezzo','Stock','Azioni'].map(h=><th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:12,fontWeight:600,color:'#64748b',borderBottom:'1px solid #e2e8f0'}}>{h}</th>)}</tr></thead>
          <tbody>
            {varianti.length===0?<tr><td colSpan={7} style={{padding:30,textAlign:'center',color:'#94a3b8'}}>Nessuna variante. Aggiungine una sopra.</td></tr>:varianti.map(v=>(
              <tr key={v.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                <td style={{padding:'10px 14px'}}><div style={{display:'flex',alignItems:'center',gap:8}}>{v.colori?.codice_hex&&<div style={{width:16,height:16,borderRadius:3,background:v.colori.codice_hex,border:'1px solid #e2e8f0'}}/>}<span style={{fontSize:14}}>{v.colore_nome||'--'}</span></div></td>
                <td style={{padding:'10px 14px',fontSize:14}}>{v.misura_nome||'--'}</td>
                <td style={{padding:'10px 14px',fontSize:13,fontFamily:'monospace'}}>{v.ean||'--'}</td>
                <td style={{padding:'10px 14px',fontSize:13}}>{v.codice_variante||'--'}</td>
                <td style={{padding:'10px 14px',fontSize:14,fontWeight:600}}>{v.prezzo_override?'euro'+Number(v.prezzo_override).toFixed(2):<span style={{color:'#94a3b8'}}>Base</span>}</td>
                <td style={{padding:'10px 14px',fontSize:14}}><span style={{background:v.stock>0?'#d1fae5':'#fee2e2',color:v.stock>0?'#065f46':'#991b1b',padding:'2px 8px',borderRadius:6,fontSize:13}}>{v.stock}</span></td>
                <td style={{padding:'10px 14px'}}><button onClick={()=>eliminaVariante(v.id)} style={{background:'#fee2e2',color:'#ef4444',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:13}}>Elimina</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (view === 'form') return (
    <div style={{padding:24,maxWidth:800,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <button onClick={()=>{setView('lista');setForm({...emptyForm});setEditId(null)}} style={btn('#64748b')}>Indietro</button>
        <h1 style={{margin:0,fontSize:22,fontWeight:700}}>{editId?'Modifica Articolo':'Nuovo Articolo'}</h1>
      </div>
      <Err/>
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'2px solid #e2e8f0'}}>
        {[['info','Info Base'],['listini','Listini e IVA']].map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t as any)} style={{background:'none',border:'none',padding:'10px 20px',cursor:'pointer',fontWeight:tab===t?700:400,color:tab===t?'#3b82f6':'#64748b',borderBottom:tab===t?'2px solid #3b82f6':'2px solid transparent',marginBottom:-2}}>{label}</button>
        ))}
      </div>
      <div style={{background:'#fff',borderRadius:12,padding:24,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        {tab==='info' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Nome Articolo *</label><input style={inp()} value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Nome articolo"/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Codice Articolo</label><input style={inp()} value={form.codice} onChange={e=>setForm(p=>({...p,codice:e.target.value}))} placeholder="es. ART001"/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>EAN / Barcode</label><input style={inp()} value={form.ean} onChange={e=>setForm(p=>({...p,ean:e.target.value}))} placeholder="Scansiona o digita EAN"/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Categoria</label><select style={inp()} value={form.categoria_id} onChange={e=>{const cat=categorie.find(c=>c.id===e.target.value);setForm(p=>({...p,categoria_id:e.target.value,categoria:cat?.nome||''}))}}><option value="">-- Nessuna --</option>{categorie.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Unita di Misura</label><select style={inp()} value={form.um} onChange={e=>setForm(p=>({...p,um:e.target.value}))}>{['Pz','Kg','Lt','Mt','Conf','Set','Paia'].map(u=><option key={u}>{u}</option>)}</select></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Stock attuale</label><input type="number" style={inp()} value={form.stock} onChange={e=>setForm(p=>({...p,stock:Number(e.target.value)}))}/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Costo acquisto</label><input type="number" step="0.01" style={inp()} value={form.costo} onChange={e=>setForm(p=>({...p,costo:Number(e.target.value)}))}/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Stato</label><select style={inp()} value={form.stato} onChange={e=>setForm(p=>({...p,stato:e.target.value}))}><option value="attivo">Attivo</option><option value="bozza">Bozza</option><option value="fuori_produzione">Fuori produzione</option></select></div>
            <div style={{gridColumn:'1/-1'}}><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Descrizione</label><textarea style={{...inp(),height:80,resize:'vertical'}} value={form.descrizione} onChange={e=>setForm(p=>({...p,descrizione:e.target.value}))} placeholder="Descrizione articolo..."/></div>
          </div>
        )}
        {tab==='listini' && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Prezzo Vendita (Listino Base)</label><input type="number" step="0.01" style={inp()} value={form.prezzo_base} onChange={e=>setForm(p=>({...p,prezzo_base:Number(e.target.value)}))}/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Prezzo Ingrosso</label><input type="number" step="0.01" style={inp()} value={form.prezzo_ingrosso} onChange={e=>setForm(p=>({...p,prezzo_ingrosso:Number(e.target.value)}))}/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Prezzo Promo</label><input type="number" step="0.01" style={inp()} value={form.prezzo_promo} onChange={e=>setForm(p=>({...p,prezzo_promo:Number(e.target.value)}))}/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>Prezzo VIP</label><input type="number" step="0.01" style={inp()} value={form.prezzo_vip} onChange={e=>setForm(p=>({...p,prezzo_vip:Number(e.target.value)}))}/></div>
            <div><label style={{fontSize:12,color:'#64748b',display:'block',marginBottom:4}}>IVA %</label><select style={inp()} value={form.iva} onChange={e=>setForm(p=>({...p,iva:Number(e.target.value)}))}>{[0,4,5,10,22].map(v=><option key={v} value={v}>{v}%</option>)}</select></div>
          </div>
        )}
        <div style={{marginTop:24,display:'flex',gap:12}}>
          <button onClick={salvaArticolo} disabled={saving} style={btn('#10b981',{padding:'10px 32px'})}>{saving?'Salvataggio...':(editId?'Aggiorna':'+ Salva Articolo')}</button>
          <button onClick={()=>{setView('lista');setForm({...emptyForm});setEditId(null)}} style={btn('#64748b',{padding:'10px 20px'})}>Annulla</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{padding:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:26,fontWeight:700}}>Articoli</h1>
          <p style={{margin:0,fontSize:14,color:'#64748b'}}>Gestione articoli, varianti, colori e misure</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>setView('tabelle')} style={btn('#8b5cf6')}>Tabelle (Colori/Misure)</button>
          <button onClick={()=>{setForm({...emptyForm});setEditId(null);setTab('info');setView('form')}} style={btn('#3b82f6')}>+ Nuovo Articolo</button>
        </div>
      </div>
      <Err/><Suc/>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <input style={{...inp(),maxWidth:280}} value={cerca} onChange={e=>setCerca(e.target.value)} placeholder="Cerca nome, codice, EAN..."/>
        <select style={{...inp(),maxWidth:200}} value={filtroCat} onChange={e=>setFiltroCat(e.target.value)}><option value="tutti">Tutte le categorie</option>{categorie.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
        <span style={{alignSelf:'center',fontSize:13,color:'#64748b'}}>{artFiltrati.length} articoli</span>
      </div>
      <div style={{background:'#fff',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.06)',overflow:'hidden'}}>
        {loading?<div style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Caricamento...</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc'}}>{['Codice','Nome','Categoria','EAN','Prezzo Base','Stock','IVA','Azioni'].map(h=><th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:12,fontWeight:600,color:'#64748b',borderBottom:'1px solid #e2e8f0'}}>{h}</th>)}</tr></thead>
            <tbody>
              {artFiltrati.length===0?<tr><td colSpan={8} style={{padding:40,textAlign:'center',color:'#94a3b8'}}>Nessun articolo trovato</td></tr>:artFiltrati.map(a=>(
                <tr key={a.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                  <td style={{padding:'10px 14px',fontSize:13,fontFamily:'monospace',color:'#64748b'}}>{a.codice||'--'}</td>
                  <td style={{padding:'10px 14px'}}><div style={{fontWeight:600,fontSize:14}}>{a.nome}</div>{a.descrizione&&<div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{a.descrizione.substring(0,50)}</div>}</td>
                  <td style={{padding:'10px 14px',fontSize:13}}>{a.categoria||'--'}</td>
                  <td style={{padding:'10px 14px',fontSize:12,fontFamily:'monospace'}}>{a.ean||'--'}</td>
                  <td style={{padding:'10px 14px',fontSize:14,fontWeight:600}}>euro{Number(a.prezzo_base||0).toFixed(2)}</td>
                  <td style={{padding:'10px 14px'}}><span style={{background:(a.stock||0)>0?'#d1fae5':'#fee2e2',color:(a.stock||0)>0?'#065f46':'#991b1b',padding:'2px 8px',borderRadius:6,fontSize:13}}>{a.stock||0}</span></td>
                  <td style={{padding:'10px 14px',fontSize:13}}>{a.iva||22}%</td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>apriVarianti(a)} style={{background:'#ede9fe',color:'#7c3aed',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12,fontWeight:600}}>Varianti</button>
                      <button onClick={()=>{setForm({nome:a.nome,codice:a.codice||'',ean:a.ean||'',categoria_id:a.categoria_id||'',prezzo_base:a.prezzo_base||0,prezzo_ingrosso:a.prezzo_ingrosso||0,prezzo_promo:a.prezzo_promo||0,prezzo_vip:a.prezzo_vip||0,iva:a.iva||22,um:a.um||'Pz',stock:a.stock||0,descrizione:a.descrizione||'',stato:a.stato||'attivo',costo:a.costo||0,categoria:a.categoria||''});setEditId(a.id);setTab('info');setView('form')}} style={{background:'#dbeafe',color:'#1d4ed8',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>Modifica</button>
                      <button onClick={()=>eliminaArticolo(a.id)} style={{background:'#fee2e2',color:'#ef4444',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12}}>Elimina</button>
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
