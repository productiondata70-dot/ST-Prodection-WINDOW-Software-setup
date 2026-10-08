import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { AppDatabase } from '../types';
import { simpleHash } from './storage';

export { auth };

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Configure Google Auth Provider with least-privilege drive.file and email scopes
export const googleDriveProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleDriveProvider.addScope(scope));
googleDriveProvider.setCustomParameters({
  prompt: 'select_account',
});

// Dedicated Google Drive folder name for ST Production and Stock Manager
export const DEDICATED_DRIVE_FOLDER_NAME = 'ST Production and Stock Manager Backups';

// In-Memory Token Caching (Per Skill Requirement: never store access token in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedUserEmail: string | null = null;
let cachedFolderId: string | null = null;
let isSigningIn = false;

// Clear cached access token when user signs out
onAuthStateChanged(auth, (user: User | null) => {
  if (!user && !isSigningIn) {
    cachedAccessToken = null;
    cachedUserEmail = null;
    cachedFolderId = null;
  }
});

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getCachedFolderId = (): string | null => {
  return cachedFolderId;
};

export const setCachedFolderId = (folderId: string | null) => {
  cachedFolderId = folderId;
};

export const clearInMemoryDriveSession = () => {
  cachedAccessToken = null;
  cachedUserEmail = null;
  cachedFolderId = null;
};

/**
 * Find or create the dedicated "ST Production and Stock Manager Backups" folder
 * in the authenticated user's actual Google Drive.
 */
export async function getOrCreateDriveFolder(accessToken: string): Promise<{ folderId: string; folderName: string }> {
  try {
    // 1. Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name = '${DEDICATED_DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    )}&fields=files(id,name)&spaces=drive`;

    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchRes.ok) {
      const errJson = await searchRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Drive search failed with status ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const existingFolder = searchData.files[0];
      cachedFolderId = existingFolder.id;
      return {
        folderId: existingFolder.id,
        folderName: existingFolder.name,
      };
    }

    // 2. Folder does not exist, create it
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DEDICATED_DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Dedicated cloud backups for ST Production and Stock Manager desktop application.',
      }),
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to create Drive folder: ${createRes.status}`);
    }

    const newFolder = await createRes.json();
    cachedFolderId = newFolder.id;
    return {
      folderId: newFolder.id,
      folderName: newFolder.name,
    };
  } catch (error: any) {
    console.error('Error finding/creating Google Drive folder:', error);
    throw error;
  }
}

/**
 * Connect real Google account via official Google OAuth 2.0 popup.
 * Authenticates, verifies token, retrieves actual user email, and finds/creates folder.
 */
export async function connectRealGoogleAccount(): Promise<{
  user: User;
  email: string;
  accessToken: string;
  folderId: string;
  folderName: string;
}> {
  try {
    isSigningIn = true;

    // Guard against running directly under file:// protocol
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      throw new Error(
        'Google Sign-In cannot use local file:// paths due to browser security restrictions. Please launch the software using the desktop executable or run "npm run electron:dev" to use localhost.'
      );
    }

    const result = await signInWithPopup(auth, googleDriveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google authorization completed, but no OAuth access token was returned.');
    }

    const accessToken = credential.accessToken;
    const email = result.user.email;

    if (!email) {
      throw new Error('Authenticated Google account does not contain a verified email address.');
    }

    cachedAccessToken = accessToken;
    cachedUserEmail = email;

    // Locate or create dedicated folder in user's real Google Drive
    const { folderId, folderName } = await getOrCreateDriveFolder(accessToken);

    return {
      user: result.user,
      email,
      accessToken,
      folderId,
      folderName,
    };
  } catch (err: any) {
    const isCancellation =
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request';

    if (isCancellation) {
      console.warn('Google sign-in popup was closed or cancelled by user.');
    } else {
      console.warn('Google Drive authentication warning:', err?.message || err);
    }

    clearInMemoryDriveSession();

    if (err?.code === 'auth/configuration-not-found') {
      throw new Error(
        'Google Sign-In configuration was not found on the Firebase project. Please ensure Google Sign-In is enabled in Firebase Authentication.'
      );
    } else if (err?.code === 'auth/unauthorized-domain') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
      const customError: any = new Error(
        `Firebase Auth Domain Authorization: The host "${hostname}" is not authorized yet in your Firebase Project. To authorize it: Open Firebase Console -> Authentication -> Settings -> Authorized Domains, and add "${hostname}". Note: Persistent local backups, JSON database export/import, and local storage continue to work seamlessly.`
      );
      customError.code = 'auth/unauthorized-domain';
      customError.hostname = hostname;
      throw customError;
    } else if (err?.code === 'auth/popup-closed-by-user') {
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      const msg = isIframe
        ? 'Google sign-in popup was closed. Please allow popups or third-party account prompts if prompted by your browser.'
        : 'Google sign-in popup was closed before completing authorization.';
      const customError: any = new Error(msg);
      customError.code = 'auth/popup-closed-by-user';
      customError.isUserCancellation = true;
      throw customError;
    } else if (err?.code === 'auth/cancelled-popup-request') {
      const customError: any = new Error('Google sign-in request was cancelled.');
      customError.code = 'auth/cancelled-popup-request';
      customError.isUserCancellation = true;
      throw customError;
    } else if (err?.code === 'auth/popup-blocked') {
      throw new Error('Google sign-in popup was blocked by browser. Please enable popups for this site.');
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Disconnect Google Drive account:
 * Clears in-memory credentials and signs out of Firebase Auth.
 */
export async function disconnectRealGoogleAccount(): Promise<void> {
  cachedAccessToken = null;
  cachedUserEmail = null;
  cachedFolderId = null;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Error during Firebase signOut:', err);
  }
}

/**
 * Upload an actual, verified database snapshot to the authenticated user's Google Drive.
 * Uses Drive v3 multipart upload.
 */
export async function uploadBackupToGoogleDrive(
  accessToken: string,
  folderId: string,
  database: AppDatabase
): Promise<{
  fileId: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}> {
  const timestamp = new Date().toISOString();
  const dateTag = timestamp.slice(0, 10) + '_' + timestamp.slice(11, 19).replace(/:/g, '-');
  const fileName = `ST_Backup_${dateTag}.json`;

  // Construct structured versioned backup payload
  const backupPayload = {
    application: 'ST Production and Stock Manager',
    version: '1.0.0',
    schemaVersion: database.schemaVersion || 1,
    exportedAt: timestamp,
    checksum: simpleHash(JSON.stringify(database)),
    summary: {
      businessName: database.profile?.businessName || 'ST Production & Stock Manager',
      productsCount: database.products.length,
      productionSessionsCount: database.productionSessions.length,
      stockBalancesCount: database.stockBalances.length,
      salesCount: database.sales.length,
      returnsCount: database.returns.length,
      wasteCount: database.wasteRecords.length,
      totalProductionWeightKg: database.productionSessions.reduce((acc, p) => acc + (p.totalWeightKg || 0), 0),
      totalProductionBags: database.productionSessions.reduce((acc, p) => acc + (p.totalBags || 0), 0),
    },
    data: database,
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const sizeBytes = new Blob([jsonString]).size;

  // Metadata for Drive multipart upload
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
    description: `ST Production and Stock Manager Backup snapshot taken at ${timestamp}`,
  };

  const boundary = '-------ST_PROD_STOCK_BACKUP_BOUNDARY_789';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonString +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson?.error?.message || `Google Drive upload failed with status ${res.status}`;
    throw new Error(message);
  }

  const result = await res.json();

  return {
    fileId: result.id,
    fileName: result.name || fileName,
    sizeBytes,
    uploadedAt: timestamp,
  };
}

/**
 * List actual backup files from the user's dedicated Google Drive folder.
 */
export async function listRealDriveBackups(
  accessToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string; createdTime: string; size: string }>> {
  try {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc&pageSize=30`;

    const res = await fetch(listUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      size: f.size ? `${(parseInt(f.size, 10) / 1024).toFixed(1)} KB` : 'JSON',
    }));
  } catch (e) {
    console.error('Failed to list backups from Google Drive:', e);
    return [];
  }
}

/**
 * Download a backup file directly from the authenticated user's Google Drive.
 */
export async function downloadRealDriveBackup(
  accessToken: string,
  fileId: string
): Promise<any> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup file from Google Drive (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json;
}
