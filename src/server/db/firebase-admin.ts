import { initializeApp, cert, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getDatabase } from "firebase-admin/database";
import { env } from "@/env";

interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

const firebaseConfig: FirebaseAdminConfig = {
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  clientEmail: env.FIREBASE_CLIENT_EMAIL ?? "",
  privateKey: (env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
};

function getFirebaseApp(config: FirebaseAdminConfig) {
  try {
    return getApp();
  } catch {
    return initializeApp({
      credential: cert(config),
      databaseURL: `https://${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`,
      storageBucket: `${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
    });
  }
}

export const adminApp = getFirebaseApp(firebaseConfig);
export const adminAuth = getAuth(adminApp);
export const adminDb = getDatabase(adminApp);
export const adminStorage = getStorage(adminApp);
