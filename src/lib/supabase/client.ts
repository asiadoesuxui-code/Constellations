import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

function readEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = readEnv('VITE_SUPABASE_ANON_KEY')

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0
}

let client: SupabaseClient<Database> | null = null

/** Returns the Supabase client. Only call when {@link isSupabaseConfigured} is true. */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env or .env.local.',
    )
  }
  client ??= createClient<Database>(supabaseUrl, supabaseAnonKey)
  return client
}

/** @deprecated Prefer {@link getSupabaseClient} after checking {@link isSupabaseConfigured}. */
export const supabase = isSupabaseConfigured()
  ? getSupabaseClient()
  : (null as unknown as SupabaseClient<Database>)
