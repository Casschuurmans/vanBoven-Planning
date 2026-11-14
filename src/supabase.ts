import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  // Wordt zichtbaar in de browserconsole als de instellingen op Vercel ontbreken.
  console.error('VITE_SUPABASE_URL of VITE_SUPABASE_ANON_KEY ontbreekt.');
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'ontbreekt');
