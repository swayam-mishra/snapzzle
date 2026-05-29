import { initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export const LEADERBOARD_ENABLED = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let db: Firestore | null = null;

if (LEADERBOARD_ENABLED) {
  try {
    const app = initializeApp({
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    });
    db = getFirestore(app);
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }
}

export { db };
