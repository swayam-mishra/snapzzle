import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const LEADERBOARD_ENABLED = !!(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let supabase: SupabaseClient | null = null;

if (LEADERBOARD_ENABLED) {
  try {
    supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  } catch (e) {
    console.warn('Supabase init failed:', e);
  }
}

export { supabase };
