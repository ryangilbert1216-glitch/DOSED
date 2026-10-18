import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
/** Prefer new publishable key; fall back to legacy anon JWT. */
const anon =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(
  url &&
    anon &&
    !url.includes('YOUR_') &&
    !anon.includes('YOUR_') &&
    anon.trim().length > 10 &&
    !anon.startsWith('sb_secret_'),
)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'dosed-auth',
        flowType: 'pkce',
      },
    })
  : null
