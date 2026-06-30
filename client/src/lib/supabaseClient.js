import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client for browser-side operations
 * Uses anon key for client-side access with RLS policies
 * 
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)