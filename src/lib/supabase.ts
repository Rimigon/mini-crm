import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
}

// В браузер уходит только publishable-ключ, доступ к данным закрывают политики RLS.
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
