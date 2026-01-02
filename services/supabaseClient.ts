
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbnjjdmjcmbcacgfpmgr.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Helper to check if we have real, usable credentials
export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey && 
  supabaseAnonKey.length > 20;

// Create client with a safe fallback to prevent immediate SDK crashes
// We use a mock-like string if the real key is missing
export const supabase = createClient(
  supabaseUrl, 
  isSupabaseConfigured ? supabaseAnonKey : 'no-anon-key-provided'
);

/**
 * Uploads a file to a specific Supabase bucket.
 */
export async function uploadFile(bucket: string, path: string, fileBody: Blob | Uint8Array | string) {
  if (!isSupabaseConfigured) {
    console.warn("Supabase storage not configured. Skipping upload.");
    return null;
  }
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBody, {
      upsert: true,
      contentType: bucket === 'worksheets-pdf' ? 'application/pdf' : 'image/png'
    });

  if (error) throw error;
  return data;
}

/**
 * Generates a public URL for a file in a storage bucket.
 */
export function getPublicUrl(bucket: string, path: string) {
  if (!isSupabaseConfigured) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
