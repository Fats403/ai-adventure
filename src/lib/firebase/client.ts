import {
  initializeApp,
  getApp,
  type FirebaseOptions,
  type FirebaseApp,
} from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { env } from "@/env";

const firebaseConfig = {
  apiKey: `${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
  authDomain: `${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: `${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`,
  storageBucket: `${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: `${env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}`,
  appId: `${env.NEXT_PUBLIC_FIREBASE_APP_ID}`,
};

function getFirebaseApp(config: FirebaseOptions) {
  try {
    return getApp();
  } catch {
    return initializeApp(config);
  }
}

export const clientApp: FirebaseApp = getFirebaseApp(firebaseConfig);
export const clientAuth = getAuth(clientApp);
export const clientDb = getDatabase(clientApp);
