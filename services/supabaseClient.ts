
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

/**
 * Supabase client initialization.
 * The URL is obtained from the user's project settings.
 * Fallbacks are provided to ensure the createClient call does not throw an error during initialization
 * if environment variables are not yet populated in the current context.
 */
const supabaseUrl = process.env.SUPABASE_URL || 'https://wbnjjdmjcmbcacgfpmgr.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'no-key-provided';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
