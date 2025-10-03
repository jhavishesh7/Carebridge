import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use an untyped Supabase client (cast to any) to avoid widespread generic typing
// issues while iterating on UI/UX changes. Replace with a properly typed client
// later (or regenerate `database.types.ts`) for stricter type safety.
export const supabase = createClient(supabaseUrl, supabaseAnonKey) as any;