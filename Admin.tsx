import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://trmiurnmgvlvbpyapeic.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_0qP7SY2FjoV0MJ8QthR72Q_NHxlSvuL';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your secrets.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
