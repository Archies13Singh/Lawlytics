import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(firebaseAdminConfig),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();

export default getApps()[0];
