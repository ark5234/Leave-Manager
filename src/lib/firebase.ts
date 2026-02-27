import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey) {
  // This will only be hit during SSR/build if env vars aren't configured on the
  // deployment platform. Add them in your Vercel / hosting dashboard.
  if (typeof window === 'undefined') {
    // Server-side: silently skip — pages are client-only anyway
  } else {
    console.error(
      '[Firebase] NEXT_PUBLIC_FIREBASE_API_KEY is not set. ' +
      'Add your Firebase environment variables to your deployment platform.'
    );
  }
}

const firebaseConfig = {
  apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize if the key is present (prevents build-time crash)
const app = apiKey
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : (getApps().length > 0 ? getApp() : initializeApp({ apiKey: 'placeholder', projectId: 'placeholder', appId: 'placeholder' }));

export const auth = getAuth(app);
export const db = getFirestore(app);
