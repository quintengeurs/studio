import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  Firestore
} from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getFunctions, Functions } from "firebase/functions";
import { getPerformance, FirebasePerformance } from "firebase/performance";

// IMPORTANT: projectId is hardcoded because Firebase App Hosting overrides
// the NEXT_PUBLIC_FIREBASE_PROJECT_ID env var with the .appspot.com storage
// bucket value, which breaks all Firestore connections.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAhlnmBT4uHArlWTCqHeiT7ljFP44dvatU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-4537887383-23869.firebaseapp.com",
  projectId: "studio-4537887383-23869",
  storageBucket: "studio-4537887383-23869.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "262002515917",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:262002515917:web:15e1a0a7fc0243b6dc6e84",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
};

// Singleton initialization
const getFirebaseApp = () => {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
};

export const app = getFirebaseApp();

// Named silo initialization for the specific database ID
const NAMED_DB_ID = "ai-studio-046cc7f7-4cac-49bd-9295-55f90b8445f0";

const getFirestoreClient = (): Firestore => {
  try {
    // Try to initialize with specific settings and named database
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, NAMED_DB_ID);
  } catch (e) {
    // If already initialized, return the existing instance
    return getFirestore(app, NAMED_DB_ID);
  }
};

export const db = getFirestoreClient();
export const auth: Auth = getAuth(app);
export const functions: Functions = getFunctions(app, "europe-west1"); // Default region for the project

// Initialize performance monitoring in browser
export const perf: FirebasePerformance | null = typeof window !== "undefined" ? getPerformance(app) : null;
