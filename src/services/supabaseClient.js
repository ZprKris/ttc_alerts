import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
)

export const supabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export function requireSupabaseClient() {
  if (!supabaseClient) {
    throw new Error(
      'Supabase is not configured. Add the public Vite environment variables.',
    )
  }

  return supabaseClient
}

export function getAuthRedirectUrl() {
  const redirectUrl = new URL(window.location.href)
  redirectUrl.hash = ''
  redirectUrl.search = ''
  redirectUrl.searchParams.set('auth', 'callback')
  return redirectUrl.toString()
}
