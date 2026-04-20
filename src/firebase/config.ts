import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// Your web app's Firebase configuration
// IMPORTANT: projectId is hardcoded because Firebase App Hosting overrides
// the NEXT_PUBLIC_FIREBASE_PROJECT_ID env var with the .appspot.com storage
// bucket value, which breaks all Firestore connections.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAhlnmBT4uHArlWTCqHeiT7ljFP44dvatU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-4537887383-23869.firebaseapp.com",
  projectId: "studio-4537887383-23869",
  storageBucket: "studio-4537887383-23869.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "262002515917",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:262002515917:web:15e1a0a7fc0243b6dc6e84",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let db: any;

try {
  // We are reverting to the (default) database silo to restore your legacy data
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
