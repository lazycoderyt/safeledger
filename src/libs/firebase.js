import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // 1. Import Auth
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore"; // 2. Import Firestore

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Prevent Firebase from initializing multiple times during Next.js hot-reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 3. Initialize services
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Forces stable HTTP connections on mobile devices
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Analytics safeguard for Next.js Server-Side Rendering (SSR)
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}

// 4. Export everything you need across your app
export { app, auth, db, analytics };
