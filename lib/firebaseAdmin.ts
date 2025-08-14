import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function initFirebaseAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  // Initialize without explicit credentials to avoid build-time error.
  // Any Firestore call will still require proper credentials at runtime.
  return initializeApp();
}

export function getDb() {
  const app = initFirebaseAdminApp();
  return getFirestore(app);
}

export function getBucket() {
  const app = initFirebaseAdminApp();
  // Use default bucket from project (projectId.appspot.com)
  return getStorage(app).bucket();
}


