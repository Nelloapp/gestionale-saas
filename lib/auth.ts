import { cookies } from 'next/headers'
import { createBrowserClient, createServerClient } from '@supabase/auth-helpers-nextjs'
import type { Session, User } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getSession(): Promise<Session | null> {
  const cookieStore = cookies()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          options: { path: '/' },
        })),
    },
  })

  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}

export async function signOut(): Promise<void> {
  const supabase = createBrowserClient(supabaseUrl, supabaseKey)
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}
