import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config is loaded from environment variables
// Development: .env.development (dev Firebase project)
// Production:  .env.production  (prod Firebase project)
// See .env.example for required variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Authentication 초기화
const auth = getAuth(app);

// Firestore 초기화
const db = getFirestore(app);

// 브라우저 로컬 스토리지에 인증 상태 유지 (브라우저 닫아도 로그인 유지)
setPersistence(auth, browserLocalPersistence);

export { auth, db };
