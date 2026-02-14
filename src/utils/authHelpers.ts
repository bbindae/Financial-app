const LAST_LOGIN_KEY = 'lastLoginTime';
const SESSION_DURATION_DAYS = 7;

/**
 * 로그인 시간을 localStorage에 저장
 */
export const saveLoginTime = (): void => {
  const now = new Date().getTime();
  localStorage.setItem(LAST_LOGIN_KEY, now.toString());
};

/**
 * 마지막 로그인 시간을 확인하여 7일이 지났는지 체크
 * @returns true면 세션 만료, false면 유효
 */
export const isSessionExpired = (): boolean => {
  const lastLoginTime = localStorage.getItem(LAST_LOGIN_KEY);
  
  if (!lastLoginTime) {
    return true; // 로그인 기록이 없으면 만료로 간주
  }

  const lastLogin = parseInt(lastLoginTime, 10);
  const now = new Date().getTime();
  const daysPassed = (now - lastLogin) / (1000 * 60 * 60 * 24);

  return daysPassed > SESSION_DURATION_DAYS;
};

/**
 * 로그인 타임스탬프 제거 (로그아웃 시 사용)
 */
export const clearLoginTime = (): void => {
  localStorage.removeItem(LAST_LOGIN_KEY);
};
