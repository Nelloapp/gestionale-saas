import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://iwvesqajdjmsuxyvplxo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dmVzcWFqZGptc3V4eXZwbHhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyNDUzMCwiZXhwIjoyMDkyMTAwNTMwfQ.SxzB4-0bOCGoOIsPzJtoa1hb5LvowgzDmIWgVYny3NQ'
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const id = searchParams.get('id')
  const clienteId = searchParams.get('cliente_id')
  const dal = searchParams.get('dal')
  const al = searchParams.get('al')

  let html = ''

  const style = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 20px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #1e293b; padding-bottom: 16px; }
      .company { font-size: 20px; font-weight: bold; color: #1e293b; }
      .doc-title { font-size: 22px; font-weight: bold; color: #3b82f6; text-align: right; }
      .doc-number { font-size: 14px; color: #64748b; text-align: right; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
      .info-box { background: #f8fafc; border-radius: 8px; padding: 12px; border-left: 4px solid #3b82f6; }
      .info-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
      .info-value { font-size: 13px; font-weight: bold; color: #1e293b; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
      th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
      td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
      tr:nth-child(even) td { background: #f8fafc; }
      .totali { background: #1e293b; color: white; padding: 12px 16px; border-radius: 8px; margin-top: 16px; display: flex; justify-content: space-between; }
      .totale-value { font-size: 18px; font-weight: bold; }
      .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; text-align: center; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
      .badge-green { background: #d1fae5; color: #065f46; }
      .badge-red { background: #fee2e2; color: #dc2626; }
      .badge-yellow { background: #fef3c7; color: #92400e; }
      .badge-blue { background: #dbeafe; color: #1d4ed8; }
      @media print { body { padding: 0; } }
    </style>
  `

  const oggi = new Date().toLocaleDateString('it-IT')

  if (tipo === 'documento' && id) {
    const { data: doc } = await supabaseAdmin.from('documenti').select('*').eq('id', id).single()
    const { data: righe } = await supabaseAdmin.from('righe_documento').select('*').eq('documento_id', id).order('posizione')
    if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })

    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${doc.tipo} ${doc.numero_doc}</title>${style}</head><body>
    <div class="header">
      <div>
        <div class="company">GESTIONALE PRO</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px">Data stampa: ${oggi}</div>
      </div>
      <div>
        <div class="doc-title">${doc.tipo}</div>
        <div class="doc-number">N. ${doc.numero_doc}</div>
        <div class="doc-number">Data: ${doc.data_documento ? new Date(doc.data_documento).toLocaleDateString('it-IT') : '—'}</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Cliente</div>
        <div class="info-value">${doc.cliente_nome || '—'}</div>
        ${doc.cliente_indirizzo ? `<div style="font-size:11px;color:#64748b;margin-top:4px">${doc.cliente_indirizzo}</div>` : ''}
        ${doc.cliente_piva ? `<div style="font-size:11px;color:#64748b">P.IVA: ${doc.cliente_piva}</div>` : ''}
      </div>
      <div class="info-box">
        <div class="info-label">Dettagli documento</div>
        <div style="font-size:11px;margin-top:4px"><strong>Pagamento:</strong> ${doc.metodo_pagamento || '—'}</div>
        <div style="font-size:11px"><strong>Listino:</strong> ${doc.listino || 'Standard'}</div>
        <div style="font-size:11px"><strong>Agente:</strong> ${doc.agente || '—'}</div>
        <div style="font-size:11px"><strong>Stato:</strong> <span class="badge badge-blue">${doc.stato || '—'}</span></div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Cod.</th><th>Descrizione Articolo</th><th>Variante</th><th>UM</th>
        <th style="text-align:right">Qta</th><th style="text-align:right">Prezzo</th>
        <th style="text-align:right">Sc%</th><th style="text-align:right">IVA%</th><th style="text-align:right">Importo</th>
      </tr></thead>
      <tbody>
        ${(righe || []).map(r => `<tr>
          <td>${r.codice_articolo || '—'}</td>
          <td><strong>${r.descrizione}</strong>${r.note_riga ? `<br><span style="color:#64748b;font-size:10px">${r.note_riga}</span>` : ''}</td>
          <td>${r.variante || '—'}</td>
          <td>${r.um || 'pz'}</td>
          <td style="text-align:right">${r.quantita}</td>
          <td style="text-align:right">€${Number(r.prezzo_unitario || 0).toFixed(2)}</td>
          <td style="text-align:right">${r.sconto1 || 0}%</td>
          <td style="text-align:right">${r.aliquota_iva || 22}%</td>
          <td style="text-align:right"><strong>€${Number(r.importo_riga || 0).toFixed(2)}</strong></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="display:flex;justify-content:flex-end">
      <div style="width:280px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0">
          <span style="color:#64748b">Imponibile:</span><strong>€${Number(doc.imponibile || 0).toFixed(2)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0">
          <span style="color:#64748b">IVA:</span><strong>€${Number(doc.totale_iva || 0).toFixed(2)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;background:#1e293b;color:white;border-radius:8px;padding:10px 12px;margin-top:8px">
          <span style="font-size:14px">TOTALE:</span><strong style="font-size:18px">€${Number(doc.totale_documento || 0).toFixed(2)}</strong>
        </div>
      </div>
    </div>
    ${doc.note ? `<div style="margin-top:16px;background:#fffbeb;border-radius:8px;padding:12px;border-left:4px solid #f59e0b"><div style="font-size:10px;font-weight:bold;color:#92400e;margin-bottom:4px">NOTE</div><div style="font-size:11px">${doc.note}</div></div>` : ''}
    <div class="footer">Documento generato il ${oggi} · Gestionale Pro</div>
    </body></html>`
  }

  else if (tipo === 'mastrino' && clienteId) {
    let q = supabaseAdmin.from('mastino_clienti').select('*').eq('cliente_id', clienteId).order('data_movimento', { ascending: true })
    if (dal) q = q.gte('data_movimento', dal)
    if (al) q = q.lte('data_movimento', al)
    const { data: movimenti } = await q
    const { data: cliente } = await supabaseAdmin.from('clienti').select('*').eq('id', clienteId).single()

    const totDare = (movimenti || []).reduce((s: number, m: any) => s + Number(m.importo_dare || 0), 0)
    const totAvere = (movimenti || []).reduce((s: number, m: any) => s + Number(m.importo_avere || 0), 0)
    const saldo = movimenti?.length ? Number(movimenti[movimenti.length - 1]?.saldo_progressivo || 0) : 0

    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Mastrino ${cliente?.nome}</title>${style}</head><body>
    <div class="header">
      <div>
        <div class="company">GESTIONALE PRO</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px">Data stampa: ${oggi}</div>
      </div>
      <div>
        <div class="doc-title">ESTRATTO CONTO</div>
        <div class="doc-number">${dal && al ? `Dal ${new Date(dal).toLocaleDateString('it-IT')} al ${new Date(al).toLocaleDateString('it-IT')}` : 'Tutti i movimenti'}</div>
      </div>
    </div>
    <div class="info-box" style="margin-bottom:20px">
      <div class="info-label">Cliente</div>
      <div class="info-value" style="font-size:16px">${cliente?.nome || '—'}</div>
      ${cliente?.indirizzo ? `<div style="font-size:11px;color:#64748b">${cliente.indirizzo}${cliente.citta ? ', ' + cliente.citta : ''}</div>` : ''}
      ${cliente?.piva ? `<div style="font-size:11px;color:#64748b">P.IVA: ${cliente.piva}</div>` : ''}
    </div>
    <table>
      <thead><tr>
        <th>Data</th><th>Causale</th><th>N. Documento</th>
        <th style="text-align:right">Dare (€)</th><th style="text-align:right">Avere (€)</th>
        <th style="text-align:right">Saldo (€)</th><th>Stato</th>
      </tr></thead>
      <tbody>
        ${(movimenti || []).map((m: any) => `<tr>
          <td>${m.data_movimento ? new Date(m.data_movimento).toLocaleDateString('it-IT') : '—'}</td>
          <td>${m.causale}</td>
          <td style="color:#3b82f6;font-weight:bold">${m.numero_doc || '—'}</td>
          <td style="text-align:right;color:${Number(m.importo_dare) > 0 ? '#dc2626' : '#94a3b8'};font-weight:bold">
            ${Number(m.importo_dare) > 0 ? '€' + Number(m.importo_dare).toFixed(2) : '—'}
          </td>
          <td style="text-align:right;color:${Number(m.importo_avere) > 0 ? '#059669' : '#94a3b8'};font-weight:bold">
            ${Number(m.importo_avere) > 0 ? '€' + Number(m.importo_avere).toFixed(2) : '—'}
          </td>
          <td style="text-align:right;font-weight:bold;color:${Number(m.saldo_progressivo) > 0 ? '#dc2626' : '#059669'}">
            €${Number(m.saldo_progressivo || 0).toFixed(2)}
          </td>
          <td><span class="badge ${m.pagato ? 'badge-green' : 'badge-yellow'}">${m.pagato ? 'Pagato' : 'Aperto'}</span></td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr style="background:#1e293b">
        <td colspan="3" style="color:white;font-weight:bold;padding:10px">TOTALI</td>
        <td style="text-align:right;color:#fca5a5;font-weight:bold;font-size:13px">€${totDare.toFixed(2)}</td>
        <td style="text-align:right;color:#6ee7b7;font-weight:bold;font-size:13px">€${totAvere.toFixed(2)}</td>
        <td style="text-align:right;color:${saldo > 0 ? '#fca5a5' : '#6ee7b7'};font-weight:bold;font-size:14px">€${saldo.toFixed(2)}</td>
        <td></td>
      </tfoot>
    </table>
    <div class="footer">Estratto conto generato il ${oggi} · Gestionale Pro</div>
    </body></html>`
  }

  else if (tipo === 'scadenzario') {
    let q = supabaseAdmin.from('scadenzario').select('*').order('data_scadenza', { ascending: true })
    if (clienteId) q = q.eq('cliente_id', clienteId)
    if (dal) q = q.gte('data_scadenza', dal)
    if (al) q = q.lte('data_scadenza', al)
    const stato = searchParams.get('stato')
    if (stato === 'aperte') q = q.eq('pagato', false)
    if (stato === 'pagate') q = q.eq('pagato', true)
    const { data: scadenze } = await q

    const totAperte = (scadenze || []).filter((s: any) => !s.pagato).reduce((t: number, s: any) => t + Number(s.importo_residuo || s.importo), 0)
    const totPagate = (scadenze || []).filter((s: any) => s.pagato).reduce((t: number, s: any) => t + Number(s.importo), 0)

    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Scadenzario</title>${style}</head><body>
    <div class="header">
      <div>
        <div class="company">GESTIONALE PRO</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px">Data stampa: ${oggi}</div>
      </div>
      <div>
        <div class="doc-title">SCADENZARIO</div>
        <div class="doc-number">${dal && al ? `Dal ${new Date(dal).toLocaleDateString('it-IT')} al ${new Date(al).toLocaleDateString('it-IT')}` : 'Tutte le scadenze'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="info-box"><div class="info-label">Da incassare</div><div style="font-size:18px;font-weight:bold;color:#f59e0b">€${totAperte.toFixed(2)}</div></div>
      <div class="info-box" style="border-color:#10b981"><div class="info-label">Incassato</div><div style="font-size:18px;font-weight:bold;color:#10b981">€${totPagate.toFixed(2)}</div></div>
      <div class="info-box" style="border-color:#3b82f6"><div class="info-label">Totale scadenze</div><div style="font-size:18px;font-weight:bold;color:#3b82f6">${(scadenze || []).length}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Scadenza</th><th>Cliente</th><th>N. Documento</th>
        <th style="text-align:right">Importo</th><th style="text-align:right">Pagato</th>
        <th style="text-align:right">Residuo</th><th>Metodo</th><th>Stato</th>
      </tr></thead>
      <tbody>
        ${(scadenze || []).map((s: any) => {
          const scaduta = !s.pagato && s.data_scadenza < new Date().toISOString().split('T')[0]
          return `<tr>
            <td style="color:${scaduta ? '#dc2626' : '#1e293b'};font-weight:${scaduta ? 'bold' : 'normal'}">${s.data_scadenza ? new Date(s.data_scadenza).toLocaleDateString('it-IT') : '—'}</td>
            <td style="font-weight:bold">${s.cliente_nome}</td>
            <td style="color:#3b82f6">${s.numero_doc || '—'}</td>
            <td style="text-align:right;font-weight:bold">€${Number(s.importo || 0).toFixed(2)}</td>
            <td style="text-align:right;color:#059669">€${Number(s.importo_pagato || 0).toFixed(2)}</td>
            <td style="text-align:right;font-weight:bold;color:${Number(s.importo_residuo) > 0 ? '#dc2626' : '#059669'}">€${Number(s.importo_residuo || 0).toFixed(2)}</td>
            <td>${s.metodo_pagamento || '—'}</td>
            <td><span class="badge ${s.pagato ? 'badge-green' : scaduta ? 'badge-red' : 'badge-yellow'}">${s.pagato ? 'Pagata' : scaduta ? 'Scaduta' : 'Aperta'}</span></td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    <div class="footer">Scadenzario generato il ${oggi} · Gestionale Pro</div>
    </body></html>`
  }

  else if (tipo === 'incassi') {
    let q = supabaseAdmin.from('mastino_clienti').select('*').eq('tipo_movimento', 'avere').order('data_movimento', { ascending: false })
    if (clienteId) q = q.eq('cliente_id', clienteId)
    if (dal) q = q.gte('data_movimento', dal)
    if (al) q = q.lte('data_movimento', al)
    const { data: incassi } = await q
    const totale = (incassi || []).reduce((s: number, i: any) => s + Number(i.importo_avere || 0), 0)

    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Registro Incassi</title>${style}</head><body>
    <div class="header">
      <div>
        <div class="company">GESTIONALE PRO</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px">Data stampa: ${oggi}</div>
      </div>
      <div>
        <div class="doc-title">REGISTRO INCASSI</div>
        <div class="doc-number">${dal && al ? `Dal ${new Date(dal).toLocaleDateString('it-IT')} al ${new Date(al).toLocaleDateString('it-IT')}` : 'Tutti gli incassi'}</div>
      </div>
    </div>
    <div style="background:#d1fae5;border-radius:8px;padding:16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:11px;font-weight:bold;color:#065f46">TOTALE INCASSATO</div><div style="font-size:24px;font-weight:bold;color:#065f46">€${totale.toFixed(2)}</div></div>
      <div style="font-size:13px;color:#065f46">${(incassi || []).length} incassi</div>
    </div>
    <table>
      <thead><tr>
        <th>Data</th><th>Cliente</th><th>Causale</th><th>N. Documento</th>
        <th style="text-align:right">Importo</th><th>Metodo</th>
      </tr></thead>
      <tbody>
        ${(incassi || []).map((i: any) => `<tr>
          <td>${i.data_movimento ? new Date(i.data_movimento).toLocaleDateString('it-IT') : '—'}</td>
          <td style="font-weight:bold">${i.cliente_nome}</td>
          <td>${i.causale}</td>
          <td style="color:#3b82f6">${i.numero_doc || '—'}</td>
          <td style="text-align:right;font-weight:bold;color:#059669">€${Number(i.importo_avere || 0).toFixed(2)}</td>
          <td>${i.metodo_pagamento || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">Registro incassi generato il ${oggi} · Gestionale Pro</div>
    </body></html>`
  }

  else {
    return NextResponse.json({ error: 'Tipo non valido. Usa: documento, mastrino, scadenzario, incassi' }, { status: 400 })
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
