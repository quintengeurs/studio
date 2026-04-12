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

const DB_ID = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";
let db: any;

try {
  // Use initializeFirestore with named silo and persistent caching
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
  }, DB_ID);
  console.log(`[Firebase] Initialized NAMED Firestore Silo: ${DB_ID}`);
} catch (e: any) {
  // Graceful reuse if already initialized
  db = getFirestore(app, DB_ID);
}

const auth = getAuth(app);

export { app, db, auth, firebaseConfig };
