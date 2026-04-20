import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iwvesqajdjmsuxyvplxo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dmVzcWFqZGptc3V4eXZwbHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjQ1MzAsImV4cCI6MjA5MjEwMDUzMH0.9VjwWEKzv2kUSE2eHkKg0NbwZImtEytc3V05HAG7rxw'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dmVzcWFqZGptc3V4eXZwbHhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjUyNDUzMCwiZXhwIjoyMDkyMTAwNTMwfQ.SxzB4-0bOCGoOIsPzJtoa1hb5LvowgzDmIWgVYny3NQ'

// Client per autenticazione (usa anon key per gestire sessioni utente)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin con service_role key - bypassa RLS per operazioni CRUD
// Usato per tutte le operazioni su dati (clienti, articoli, cassa, ecc.)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
