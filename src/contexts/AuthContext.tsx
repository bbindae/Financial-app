import React, { createContext, useEffect, useState, useRef, ReactNode } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { saveLoginTime, isSessionExpired, clearLoginTime } from '../utils/authHelpers';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isSigningInRef = useRef(false);

  useEffect(() => {
    // Firebase 인증 상태 변경 리스너
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthContext - onAuthStateChanged 호출됨, user:', user?.email || 'null', 'isSigningIn:', isSigningInRef.current);
      if (user) {
        // 로그인 중이면 세션 체크를 건너뛰고 바로 설정
        if (isSigningInRef.current) {
          console.log('AuthContext - 로그인 진행 중, currentUser 설정:', user.email);
          setCurrentUser(user);
          isSigningInRef.current = false;
        } else {
          // 기존 세션 체크 (앱 재시작 시)
          if (isSessionExpired()) {
            // 7일이 지났으면 자동 로그아웃
            console.log('AuthContext - 세션 만료, 로그아웃 처리');
            await firebaseSignOut(auth);
            clearLoginTime();
            setCurrentUser(null);
          } else {
            console.log('AuthContext - 기존 세션 유지, currentUser 설정:', user.email);
            setCurrentUser(user);
          }
        }
      } else {
        console.log('AuthContext - 로그인되지 않음, currentUser = null');
        setCurrentUser(null);
        isSigningInRef.current = false;
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    isSigningInRef.current = true;
    saveLoginTime(); // 로그인 시간 먼저 저장
    await signInWithEmailAndPassword(auth, email, password);
    console.log('AuthContext - signInWithEmailAndPassword 완료');
  };

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
    clearLoginTime(); // 로그인 시간 제거
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
