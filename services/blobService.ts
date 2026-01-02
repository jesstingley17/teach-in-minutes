
import { put } from "@vercel/blob";

/**
 * Uploads a file to Vercel Blob and returns the public URL.
 * Note: Requires BLOB_READ_WRITE_TOKEN in process.env.
 */
export async function uploadAsset(file: File): Promise<string> {
  try {
    const { url } = await put(`assets/${Date.now()}-${file.name}`, file, {
      access: 'public',
      // In a client environment, we rely on the token being injected via process.env
      // Note: For client-side 'put', the @vercel/blob package usually expects a server route or signed token.
      // This implementation follows the user request to use 'put' with access 'public'.
    });
    return url;
  } catch (error) {
    console.error("Vercel Blob Upload Failed:", error);
    throw new Error("Cloud synchronization failed. Check connectivity and credentials.");
  }
}
