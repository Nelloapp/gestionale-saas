import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://iwvesqajdjmsuxyvplxo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dmVzcWFqZGptc3V4eXZwbHhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyNDUzMCwiZXhwIjoyMDkyMTAwNTMwfQ.SxzB4-0bOCGoOIsPzJtoa1hb5LvowgzDmIWgVYny3NQ',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const results: string[] = []

  // Crea tabella documenti
  const { error: e1 } = await supabaseAdmin.rpc('exec_ddl', {
    sql: `CREATE TABLE IF NOT EXISTS documenti (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID,
      numero_doc TEXT NOT NULL DEFAULT '',
      serie TEXT DEFAULT '1',
      progressivo INTEGER,
      anno INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
      tipo TEXT NOT NULL DEFAULT 'preventivo',
      causale TEXT,
      cliente_id UUID,
      cliente_nome TEXT,
      cliente_indirizzo TEXT,
      cliente_piva TEXT,
      cliente_cf TEXT,
      data_registrazione DATE DEFAULT CURRENT_DATE,
      data_documento DATE DEFAULT CURRENT_DATE,
      data_consegna DATE,
      pagamento TEXT DEFAULT 'contanti',
      metodo_pagamento TEXT DEFAULT 'contanti',
      data_scadenza DATE,
      listino TEXT DEFAULT 'base',
      agente TEXT,
      bollettatore TEXT,
      deposito TEXT DEFAULT '1',
      nome_deposito TEXT,
      tipo_bolla TEXT DEFAULT 'banco',
      dest_nome TEXT, dest_indirizzo TEXT, dest_cap TEXT, dest_citta TEXT, dest_provincia TEXT,
      totale_imponibile DECIMAL(12,2) DEFAULT 0,
      totale_iva DECIMAL(12,2) DEFAULT 0,
      totale_documento DECIMAL(12,2) DEFAULT 0,
      totale_sconto DECIMAL(12,2) DEFAULT 0,
      stato TEXT DEFAULT 'bozza',
      doc_riferimento TEXT,
      note TEXT, note_interne TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`
  })
  results.push(e1 ? `documenti ERROR: ${e1.message}` : 'documenti OK')

  return NextResponse.json({ results })
}
