import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ggsuhfqmuqsavlprxowb.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_O1Of50vyXXNODDaWulJLEg_j6OgSEYN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);