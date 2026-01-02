
/**
 * Google Drive Integration Service
 * Uses Google Identity Services for OAuth2 and Google Drive API for uploads.
 */

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/**
 * Initiates the Google OAuth process to get an access token.
 */
export async function authenticateGoogleDrive(customClientId?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const clientId = customClientId || (window as any).process?.env?.GOOGLE_CLIENT_ID || 'dummy-client-id';
    
    if (clientId === 'dummy-client-id' && !customClientId) {
      reject(new Error("Google Client ID not configured. Please set it in the Branding Portal."));
      return;
    }

    const client = (window as any).google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
        } else {
          resolve(response.access_token);
        }
      },
    });

    if (!client) {
      reject(new Error("Google Identity Services script not loaded. Check index.html."));
      return;
    }

    client.requestAccessToken();
  });
}

/**
 * Uploads a Blob (PDF) to the user's Google Drive.
 */
export async function uploadToGoogleDrive(
  token: string, 
  blob: Blob, 
  filename: string
): Promise<any> {
  const metadata = {
    name: filename,
    mimeType: 'application/pdf',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', blob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Google Drive upload failed.");
  }

  return response.json();
}
