import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedDb: Firestore | null = null;

export function getFirebaseDb(): Firestore | null {
  if (cachedDb) return cachedDb;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

  try {
    if (getApps().length === 0) {
      if (projectId && clientEmail && rawKey) {
        const privateKey = rawKey.replace(/\\n/g, "\n");
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else if (serviceAccountJson) {
        const parsed = JSON.parse(serviceAccountJson);
        initializeApp({
          credential: cert(parsed),
        });
      } else {
        return null;
      }
    }
    cachedDb = getFirestore();
    return cachedDb;
  } catch (err) {
    console.warn("[Firebase] Initialization notice:", err);
    return null;
  }
}
