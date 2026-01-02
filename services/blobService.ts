
import { put } from "@vercel/blob";

/**
 * Uploads a file to Vercel Blob and returns the public URL.
 * Fallback: If cloud upload fails or credentials are missing, returns a local Data URL (base64).
 */
export async function uploadAsset(file: File): Promise<string> {
  try {
    // Attempt cloud upload if possible
    const { url } = await put(`assets/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });
    return url;
  } catch (error) {
    console.warn("Vercel Blob Upload Failed, falling back to local base64 encoding.", error);
    
    // Fallback to local Data URL so the user isn't blocked
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(new Error("Failed to encode local asset."));
      reader.readAsDataURL(file);
    });
  }
}
