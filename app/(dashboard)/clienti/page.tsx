'use client'
import { useState } from 'react'

const clientiDemo = [
  {
    id: 1,
    nome: 'Rossi Group SRL', tipo: 'azienda', piva: 'IT12345678901', cf: '12345678901',
    sdi: 'ABCDE12', pec: 'rossigroup@pec.it', email: 'info@rossigroup.it',
    tel: '+39 02 1234567', cellulare: '+39 333 1234567', sito: 'www.rossigroup.it',
    indirizzo: 'Via Roma 1', cap: '20100', citta: 'Milano', provincia: 'MI', paese: 'Italia',
    listino: 'premium', sconto: 10, fido: 10000, pagamento: '30gg', metodo_pagamento: 'bonifico',
    agente: 'Mario Rossi', categoria: 'vip', stato: 'attivo',
    data_primo_acquisto: '2023-01-15', note: 'Cliente storico, priorità alta',
    fatturato: 42000, saldo_aperto: 3200, num_fatture: 18, ultimo_ordine: '2026-04-10',
  },
  {
    id: 2,
    nome: 'Bianchi SPA', tipo: 'azienda', piva: 'IT98765432101', cf: '98765432101',
    sdi: 'XYZ9876', pec: 'bianchi@pec.it', email: 'info@bianchi.it',
    tel: '+39 06 9876543', cellulare: '+39 347 9876543', sito: 'www.bianchi.it',
    indirizzo: 'Via Veneto 45', cap: '00187', citta: 'Roma', provincia: 'RM', paese: 'Italia',
    listino: 'base', sconto: 5, fido: 5000, pagamento: '60gg', metodo_pagamento: 'bonifico',
    agente: 'Sara Ferri', categoria: 'standard', stato: 'attivo',
    data_primo_acquisto: '2023-06-01', note: '',
    fatturato: 28500, saldo_aperto: 0, num_fatture: 12, ultimo_ordine: '2026-03-22',
  },
  {
    id: 3,
    nome: 'Mario Verdi', tipo: 'privato', piva: '', cf: 'VRDMRA80A01L219X',
    sdi: '0000000', pec: '', email: 'mario.verdi@gmail.com',
    tel: '+39 333 1112222', cellulare: '+39 333 1112222', sito: '',
    indirizzo: 'Via Po 12', cap: '10121', citta: 'Torino', provincia: 'TO', paese: 'Italia',
    listino: 'base', sconto: 0, fido: 1000, pagamento: 'immediato', metodo_pagamento: 'contanti',
    agente: '', categoria: 'occasionale', stato: 'attivo',
    data_primo_acquisto: '2024-02-10', note: '',
    fatturato: 5200, saldo_aperto: 0, num_fatture: 4, ultimo_ordine: '2026-01-15',
  },
  {
    id: 4,
    nome: 'Verde & Co SNC', tipo: 'azienda', piva: 'IT11122233301', cf: '11122233301',
    sdi: 'VRD1234', pec: '', email: 'verde@co.it',
    tel: '+39 347 5554444', cellulare: '', sito: '',
    indirizzo: 'Corso Umberto 88', cap: '80138', citta: 'Napoli', provincia: 'NA', paese: 'Italia',
    listino: 'base', sconto: 0, fido: 2000, pagamento: '30gg', metodo_pagamento: 'bonifico',
    agente: '', categoria: 'standard', stato: 'prospect',
    data_primo_acquisto: '', note: 'Contattato in fiera, interessato ai prodotti premium',
    fatturato: 0, saldo_aperto: 0, num_fatture: 0, ultimo_ordine: '',
  },
]

const formVuoto: any = {
  nome: '', tipo: 'azienda', piva: '', cf: '', sdi: '', pec: '',
  email: '', tel: '', cellulare: '', sito: '',
  indirizzo: '', cap: '', citta: '', provincia: '', paese: 'Italia',
  listino: 'base', sconto: 0, fido: 0, pagamento: '30gg', metodo_pagamento: 'bonifico',
  agente: '', categoria: 'standard', stato: 'attivo', data_primo_acquisto: '', note: '',
}

const tabs = [
  { id: 'anagrafica', label: '👤 Anagrafica' },
  { id: 'contatti', label: '📞 Contatti' },
  { id: 'commerciale', label: '💼 Commerciale' },
  { id: 'amministrativo', label: '⚙️ Amministrativo' },
]

export default function ClientiPage() {
  const [clienti, setClienti] = useState<any[]>(clientiDemo)
  const [cerca, setCerca] = useState('')
  const [filtroStato, setFiltroStato] = useState('tutti')
  const [mostraForm, setMostraForm] = useState(false)
  const [clienteSelezionato, setClienteSelezionato] = useState<any>(null)
  const [schedaAperta, setSchedaAperta] = useState<any>(null)
  const [tabForm, setTabForm] = useState('anagrafica')
  const [form, setForm] = useState<any>(formVuoto)

  const filtrati = clienti.filter(c => {
    const matchCerca =
      c.nome.toLowerCase().includes(cerca.toLowerCase()) ||
      c.email.toLowerCase().includes(cerca.toLowerCase()) ||
      c.citta.toLowerCase().includes(cerca.toLowerCase()) ||
      (c.piva || '').toLowerCase().includes(cerca.toLowerCase())
    const matchStato = filtroStato === 'tutti' || c.stato === filtroStato
    return matchCerca && matchStato
  })

  const salvaCliente = () => {
    if (!form.nome) return
    if (clienteSelezionato) {
      setClienti(clienti.map(c => c.id === clienteSelezionato.id ? { ...c, ...form } : c))
    } else {
      setClienti([...clienti, { ...form, id: Date.now(), fatturato: 0, saldo_aperto: 0, num_fatture: 0, ultimo_ordine: '' }])
    }
    setMostraForm(false)
    setClienteSelezionato(null)
    setForm(formVuoto)
    setTabForm('anagrafica')
  }

  const eliminaCliente = (id: number) => {
    if (confirm('Eliminare questo cliente?')) setClienti(clienti.filter(c => c.id !== id))
  }

  const modificaCliente = (c: any) => {
    setClienteSelezionato(c)
    setForm({ ...c })
    setTabForm('anagrafica')
    setMostraForm(true)
  }

  const statoColore: any = {
    attivo: { bg: '#dcfce7', color: '#166534' },
    prospect: { bg: '#fef9c3', color: '#854d0e' },
    sospeso: { bg: '#fee2e2', color: '#991b1b' },
    bloccato: { bg: '#f1f5f9', color: '#475569' },
  }
  const categoriaColore: any = {
    vip: { bg: '#fef3c7', color: '#92400e' },
    standard: { bg: '#eff6ff', color: '#1e40af' },
    occasionale: { bg: '#f0fdf4', color: '#166534' },
  }
  const listinoLabel: any = { base: 'Base', premium: 'Premium', rivenditori: 'Rivenditori' }
  const pagamentoLabel: any = { immediato: 'Immediato', '30gg': '30 gg', '60gg': '60 gg', '90gg': '90 gg' }
  const metodoPagLabel: any = { bonifico: 'Bonifico', contanti: 'Contanti', carta: 'Carta', rid: 'RID/SDD' }

  const inp: any = { width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', outline: 'none', background: 'white', boxSizing: 'border-box' }
  const lbl: any = { display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }
  const fld: any = { marginBottom: '14px' }

  return (
    <div style={{ fontFamily: 'system-ui', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>Clienti</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>{clienti.length} clienti totali</p>
        </div>
        <button onClick={() => { setMostraForm(true); setClienteSelezionato(null); setForm(formVuoto); setTabForm('anagrafica') }}
          style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
          + Nuovo Cliente
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '18px' }}>
        {[
          { label: 'Attivi', value: clienti.filter(c => c.stato === 'attivo').length, color: '#22c55e' },
          { label: 'Prospect', value: clienti.filter(c => c.stato === 'prospect').length, color: '#f59e0b' },
          { label: 'Fatturato Totale', value: '€' + clienti.reduce((s, c) => s + (c.fatturato || 0), 0).toLocaleString('it-IT'), color: '#3b82f6' },
          { label: 'Saldo Aperto', value: '€' + clienti.reduce((s, c) => s + (c.saldo_aperto || 0), 0).toLocaleString('it-IT'), color: '#ef4444' },
        ].map(k => (
          <div key={k.label} style={{ background: 'white', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>{k.label}</p>
            <p style={{ fontSize: '20px', fontWeight: '700', color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Cerca */}
      <input value={cerca} onChange={e => setCerca(e.target.value)} placeholder="🔍 Cerca per nome, email, P.IVA, città..."
        style={{ ...inp, marginBottom: '10px' }} />

      {/* Filtri stato */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['tutti', 'attivo', 'prospect', 'sospeso', 'bloccato'].map(s => (
          <button key={s} onClick={() => setFiltroStato(s)}
            style={{ padding: '6px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
              background: filtroStato === s ? '#3b82f6' : '#f1f5f9', color: filtroStato === s ? 'white' : '#374151' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtrati.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Nessun cliente trovato</div>}
        {filtrati.map(c => (
          <div key={c.id} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <p style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{c.nome}</p>
                  <span style={{ background: categoriaColore[c.categoria]?.bg || '#f1f5f9', color: categoriaColore[c.categoria]?.color || '#374151', padding: '1px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '700' }}>
                    {(c.categoria || '').toUpperCase()}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                  {c.tipo === 'azienda' ? '🏢' : c.tipo === 'privato' ? '👤' : c.tipo === 'pubblica_amministrazione' ? '🏛️' : '🌍'} {c.tipo} · {c.citta}{c.provincia ? ` (${c.provincia})` : ''}
                </p>
              </div>
              <span style={{ background: statoColore[c.stato]?.bg || '#f1f5f9', color: statoColore[c.stato]?.color || '#374151', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                {c.stato}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', marginBottom: '10px' }}>
              {c.email && <p style={{ color: '#64748b', fontSize: '12px' }}>📧 {c.email}</p>}
              {c.tel && <p style={{ color: '#64748b', fontSize: '12px' }}>📞 {c.tel}</p>}
              {c.piva && <p style={{ color: '#64748b', fontSize: '12px' }}>🏷️ {c.piva}</p>}
              {c.sdi && <p style={{ color: '#64748b', fontSize: '12px' }}>📄 SDI: {c.sdi}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8' }}>Fatturato</p>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>€{(c.fatturato || 0).toLocaleString('it-IT')}</p>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8' }}>Saldo</p>
                <p style={{ fontSize: '13px', fontWeight: '700', color: (c.saldo_aperto || 0) > 0 ? '#ef4444' : '#22c55e' }}>€{(c.saldo_aperto || 0).toLocaleString('it-IT')}</p>
              </div>
              <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8' }}>Listino</p>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6' }}>{listinoLabel[c.listino] || c.listino}</p>
              </div>
            </div>

            {c.sconto > 0 && (
              <p style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>🏷️ Sconto: {c.sconto}% · Fido: €{(c.fido || 0).toLocaleString('it-IT')}</p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setSchedaAperta(c)} style={{ flex: 1, background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: '6px', padding: '7px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>👁️ Scheda</button>
              <button onClick={() => modificaCliente(c)} style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '6px', padding: '7px', fontSize: '13px', cursor: 'pointer' }}>✏️ Modifica</button>
              <button onClick={() => eliminaCliente(c.id)} style={{ flex: 1, background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', padding: '7px', fontSize: '13px', cursor: 'pointer' }}>🗑️ Elimina</button>
            </div>
          </div>
        ))}
      </div>

      {/* SCHEDA CLIENTE */}
      {schedaAperta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{schedaAperta.nome}</h2>
                <p style={{ color: '#64748b', fontSize: '13px' }}>{schedaAperta.tipo} · {schedaAperta.citta}</p>
              </div>
              <button onClick={() => setSchedaAperta(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '18px' }}>
              {[
                { label: 'Fatturato totale', value: '€' + (schedaAperta.fatturato || 0).toLocaleString('it-IT'), color: '#3b82f6' },
                { label: 'Saldo aperto', value: '€' + (schedaAperta.saldo_aperto || 0).toLocaleString('it-IT'), color: (schedaAperta.saldo_aperto || 0) > 0 ? '#ef4444' : '#22c55e' },
                { label: 'N° Fatture', value: schedaAperta.num_fatture || 0, color: '#8b5cf6' },
                { label: 'Ultimo ordine', value: schedaAperta.ultimo_ordine || '—', color: '#64748b' },
              ].map((k: any) => (
                <div key={k.label} style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{k.label}</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: k.color }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontWeight: '700', color: '#0f172a', marginBottom: '8px', fontSize: '14px' }}>📋 Dati Anagrafici</p>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', display: 'grid', gap: '8px' }}>
                {[
                  ['P.IVA', schedaAperta.piva], ['Cod. Fiscale', schedaAperta.cf],
                  ['Cod. SDI', schedaAperta.sdi], ['PEC', schedaAperta.pec],
                  ['Indirizzo', `${schedaAperta.indirizzo || ''}, ${schedaAperta.cap || ''} ${schedaAperta.citta || ''} (${schedaAperta.provincia || ''})`],
                  ['Paese', schedaAperta.paese],
                ].filter(([, v]) => v && v.trim && v.trim() !== ', ()').map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>{k}</span>
                    <span style={{ fontWeight: '500', color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontWeight: '700', color: '#0f172a', marginBottom: '8px', fontSize: '14px' }}>💼 Condizioni Commerciali</p>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', display: 'grid', gap: '8px' }}>
                {[
                  ['Listino', listinoLabel[schedaAperta.listino] || schedaAperta.listino],
                  ['Sconto fisso', (schedaAperta.sconto || 0) + '%'],
                  ['Fido massimo', '€' + (schedaAperta.fido || 0).toLocaleString('it-IT')],
                  ['Pagamento', pagamentoLabel[schedaAperta.pagamento] || schedaAperta.pagamento],
                  ['Metodo pag.', metodoPagLabel[schedaAperta.metodo_pagamento] || schedaAperta.metodo_pagamento],
                  ['Agente', schedaAperta.agente || '—'],
                  ['Categoria', schedaAperta.categoria],
                ].map(([k, v]) => (
                  <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>{k}</span>
                    <span style={{ fontWeight: '500', color: '#0f172a' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {schedaAperta.note && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontWeight: '700', color: '#0f172a', marginBottom: '8px', fontSize: '14px' }}>📝 Note Interne</p>
                <div style={{ background: '#fefce8', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#713f12' }}>{schedaAperta.note}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setSchedaAperta(null); modificaCliente(schedaAperta) }}
                style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>✏️ Modifica</button>
              <button onClick={() => setSchedaAperta(null)}
                style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>Chiudi</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM NUOVO/MODIFICA */}
      {mostraForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: 'white', borderRadius: '16px 16px 0 0', padding: '24px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{clienteSelezionato ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>
              <button onClick={() => setMostraForm(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', overflowX: 'auto', paddingBottom: '4px' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTabForm(t.id)}
                  style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
                    background: tabForm === t.id ? '#3b82f6' : '#f1f5f9', color: tabForm === t.id ? 'white' : '#374151' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tabForm === 'anagrafica' && (
              <div>
                <div style={fld}><label style={lbl}>Nome / Ragione Sociale *</label><input style={inp} placeholder="Es. Rossi SRL" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Tipo Cliente</label>
                  <select style={inp} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    <option value="azienda">🏢 Azienda</option>
                    <option value="privato">👤 Privato</option>
                    <option value="pubblica_amministrazione">🏛️ Pubblica Amministrazione</option>
                    <option value="estero">🌍 Cliente Estero</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Partita IVA</label><input style={inp} placeholder="IT12345678901" value={form.piva} onChange={e => setForm({ ...form, piva: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Codice Fiscale</label><input style={inp} placeholder="RSSMRA80A01H501Z" value={form.cf} onChange={e => setForm({ ...form, cf: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Codice SDI</label><input style={inp} placeholder="Es. ABCDE12 oppure 0000000" value={form.sdi} onChange={e => setForm({ ...form, sdi: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>PEC</label><input style={inp} type="email" placeholder="azienda@pec.it" value={form.pec} onChange={e => setForm({ ...form, pec: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Indirizzo</label><input style={inp} placeholder="Via Roma 1" value={form.indirizzo} onChange={e => setForm({ ...form, indirizzo: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '14px' }}>
                  <div><label style={lbl}>CAP</label><input style={inp} placeholder="20100" value={form.cap} onChange={e => setForm({ ...form, cap: e.target.value })} /></div>
                  <div><label style={lbl}>Città</label><input style={inp} placeholder="Milano" value={form.citta} onChange={e => setForm({ ...form, citta: e.target.value })} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '14px' }}>
                  <div><label style={lbl}>Provincia</label><input style={inp} placeholder="MI" value={form.provincia} onChange={e => setForm({ ...form, provincia: e.target.value })} /></div>
                  <div><label style={lbl}>Paese</label><input style={inp} placeholder="Italia" value={form.paese} onChange={e => setForm({ ...form, paese: e.target.value })} /></div>
                </div>
              </div>
            )}

            {tabForm === 'contatti' && (
              <div>
                <div style={fld}><label style={lbl}>Email</label><input style={inp} type="email" placeholder="info@azienda.it" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Telefono</label><input style={inp} type="tel" placeholder="+39 02 1234567" value={form.tel} onChange={e => setForm({ ...form, tel: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Cellulare</label><input style={inp} type="tel" placeholder="+39 333 1234567" value={form.cellulare} onChange={e => setForm({ ...form, cellulare: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Sito Web</label><input style={inp} placeholder="www.azienda.it" value={form.sito} onChange={e => setForm({ ...form, sito: e.target.value })} /></div>
              </div>
            )}

            {tabForm === 'commerciale' && (
              <div>
                <div style={fld}><label style={lbl}>Listino Prezzi</label>
                  <select style={inp} value={form.listino} onChange={e => setForm({ ...form, listino: e.target.value })}>
                    <option value="base">Base</option>
                    <option value="premium">Premium</option>
                    <option value="rivenditori">Rivenditori</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Sconto Fisso (%)</label><input style={inp} type="number" min="0" max="100" placeholder="0" value={form.sconto} onChange={e => setForm({ ...form, sconto: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fld}><label style={lbl}>Fido Massimo (€)</label><input style={inp} type="number" min="0" placeholder="0" value={form.fido} onChange={e => setForm({ ...form, fido: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fld}><label style={lbl}>Condizioni di Pagamento</label>
                  <select style={inp} value={form.pagamento} onChange={e => setForm({ ...form, pagamento: e.target.value })}>
                    <option value="immediato">Immediato</option>
                    <option value="30gg">30 giorni</option>
                    <option value="60gg">60 giorni</option>
                    <option value="90gg">90 giorni</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Metodo di Pagamento</label>
                  <select style={inp} value={form.metodo_pagamento} onChange={e => setForm({ ...form, metodo_pagamento: e.target.value })}>
                    <option value="bonifico">Bonifico</option>
                    <option value="contanti">Contanti</option>
                    <option value="carta">Carta</option>
                    <option value="rid">RID/SDD</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Agente / Commerciale</label><input style={inp} placeholder="Nome agente assegnato" value={form.agente} onChange={e => setForm({ ...form, agente: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Categoria Cliente</label>
                  <select style={inp} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                    <option value="vip">VIP</option>
                    <option value="standard">Standard</option>
                    <option value="occasionale">Occasionale</option>
                  </select>
                </div>
              </div>
            )}

            {tabForm === 'amministrativo' && (
              <div>
                <div style={fld}><label style={lbl}>Stato Cliente</label>
                  <select style={inp} value={form.stato} onChange={e => setForm({ ...form, stato: e.target.value })}>
                    <option value="attivo">✅ Attivo</option>
                    <option value="prospect">🎯 Prospect</option>
                    <option value="sospeso">⏸️ Sospeso</option>
                    <option value="bloccato">🚫 Bloccato</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Data Primo Acquisto</label><input style={inp} type="date" value={form.data_primo_acquisto} onChange={e => setForm({ ...form, data_primo_acquisto: e.target.value })} /></div>
                <div style={fld}><label style={lbl}>Note Interne</label>
                  <textarea style={{ ...inp, minHeight: '100px', resize: 'vertical' as const }} placeholder="Note private per il team..."
                    value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>
            )}

            {/* Navigazione */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {tabForm !== 'anagrafica' && (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) - 1].id)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>← Indietro</button>
              )}
              {tabForm !== 'amministrativo' ? (
                <button onClick={() => setTabForm(tabs[tabs.findIndex(t => t.id === tabForm) + 1].id)}
                  style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer' }}>Avanti →</button>
              ) : (
                <button onClick={salvaCliente}
                  style={{ flex: 1, background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: '700', cursor: 'pointer' }}>💾 Salva Cliente</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
