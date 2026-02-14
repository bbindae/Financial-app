import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

// TODO: Firebase Console에서 프로젝트를 생성한 후 아래 설정값을 업데이트하세요.
// Firebase Console > Project Settings > Your apps > Web app > Config
const firebaseConfig = {
  apiKey: "AIzaSyBbDdqV4tCowKPwiRNJqVPyRsqcfh-5f9k",
  authDomain: "financial-app-ai.firebaseapp.com",
  projectId: "financial-app-ai",
  storageBucket: "financial-app-ai.firebasestorage.app",
  messagingSenderId: "108411097374",
  appId: "1:108411097374:web:f5d2374daf5eff70d1b90f"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Authentication 초기화
const auth = getAuth(app);

// 브라우저 로컬 스토리지에 인증 상태 유지 (브라우저 닫아도 로그인 유지)
setPersistence(auth, browserLocalPersistence);

export { auth };
