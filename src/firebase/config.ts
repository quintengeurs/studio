import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-4537887383-23869",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const DB_ID = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";
let db: any;

try {
  // Use initializeFirestore with experimentalForceLongPolling for stability
  // Defaulting to (default) silo as it was flagged as restoring data in commit 4571839
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  });
  console.log(`[Firebase] Initialized DEFAULT Firestore Silo: (default)`);
} catch (e: any) {
  // Graceful reuse if already initialized
  db = getFirestore(app);
}

const auth = getAuth(app);

export { app, db, auth, firebaseConfig };

