
'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function initializeFirebase() {
  if (getApps().length === 0) {
    const config = {
      ...firebaseConfig,
      apiKey: firebaseConfig.apiKey || "dummy-key"
    };
    app = initializeApp(config);
  } else {
    app = getApp();
  }

db = getFirestore(app);
auth = getAuth(app);

if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
    // Before any Firestore operations, connect to the emulator
    connectFirestoreEmulator(db, process.env.NEXT_PUBLIC_EMULATOR_HOST, 8080);
    connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_EMULATOR_HOST}:9099`);
}

return { app, db, auth };
}

// We need to make sure that we are only initializing once
if (getApps().length === 0) {
    initializeFirebase();
}

export { app, db, auth };
