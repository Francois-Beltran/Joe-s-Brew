import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Supabase admin client with service role key
 * Provides full database access for server-side operations
 * Bypasses RLS policies - use with caution
 * 
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)