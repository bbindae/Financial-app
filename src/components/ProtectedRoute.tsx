import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Firebase 초기화 중일 때 로딩 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 로그인된 경우 자식 컴포넌트 렌더링
  return children;
};

export default ProtectedRoute;
