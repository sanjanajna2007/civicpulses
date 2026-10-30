import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const configured = Boolean(url && key);
// Only the public anon key is used here. Security is enforced by Row Level Security in supabase/schema.sql.
export const supabase = createClient(url || 'http://localhost', key || 'missing');
