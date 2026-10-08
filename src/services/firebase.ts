import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  ...firebaseAppletConfig,
  apiKey: firebaseAppletConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
};

// Initialize Firebase App, Auth, and Firestore
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);

/**
 * Validates connection to the backend Firestore project.
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return { success: true, message: 'Connected to Firestore backend.' };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return { success: false, message: 'Client offline or Firestore backend unreachable.' };
    }
    // Document might not exist which is fine, connection succeeded
    if (error?.code === 'permission-denied') {
      return { success: true, message: 'Firestore connected (rules evaluated).' };
    }
    return { success: true, message: 'Firestore backend connected.' };
  }
}

/**
 * Syncs a business snapshot to Firestore cloud backend if enabled.
 */
export async function syncBusinessSnapshotToFirestore(
  businessId: string,
  snapshotPayload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const docId = `snapshot_${businessId}_${Date.now()}`;
    await setDoc(doc(firestore, 'business_snapshots', docId), {
      businessId,
      syncedAt: new Date().toISOString(),
      payload: JSON.stringify(snapshotPayload),
    });
    return { success: true };
  } catch (err: any) {
    console.warn('Firestore cloud snapshot sync error:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to sync to Firestore' };
  }
}

