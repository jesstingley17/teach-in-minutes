
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wbnjjdmjcmbcacgfpmgr.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'no-key-provided';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to a specific Supabase bucket.
 * Useful for sharing generated worksheets as PDFs or storing doodles.
 */
export async function uploadFile(bucket: string, path: string, fileBody: Blob | Uint8Array | string) {
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
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Database Schema Reference (for RLS policies):
 * 
 * -- Worksheets table
 * CREATE TABLE worksheets (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID REFERENCES auth.users(id),
 *   title TEXT NOT NULL,
 *   topic TEXT,
 *   document_type TEXT,
 *   questions JSONB,
 *   saved_at BIGINT,
 *   share_url TEXT
 * );
 * 
 * -- Enable RLS
 * ALTER TABLE worksheets ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users can manage their own worksheets" ON worksheets FOR ALL USING (auth.uid() = user_id);
 */
