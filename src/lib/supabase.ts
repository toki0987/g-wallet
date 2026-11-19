import { createClient } from '@supabase/supabase-js';

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://infobehgctyemvdtyspd.supabase.co';

// Normalize if user supplied the /rest/v1/ endpoint suffix
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_MVV2YNi1xO1d6QkqruA0rg_07YxgT5w';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export function formatSupabaseError(error: unknown, context: string): never {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  console.error(`Supabase Error (${context}):`, error);
  throw new Error(`${context}: ${message}`);
}
