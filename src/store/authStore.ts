import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  
  login: (token: string, user: User) => {
    // localStorage에 인증 정보 저장
    localStorage.setItem('access_token', token);
    localStorage.setItem('token_type', 'Bearer');
    localStorage.setItem('user_data', JSON.stringify(user));
    
    set({ user, isAuthenticated: true });
  },
  
  logout: () => {
    // 토큰 및 사용자 정보 제거
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_data');
    set({ user: null, isAuthenticated: false });
  },
  
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
  
  checkAuth: () => {
    try {
      // 토큰이 있는지 확인
      const token = localStorage.getItem('access_token');
      const userData = localStorage.getItem('user_data');
      
      console.log('checkAuth 실행:', { 
        hasToken: !!token, 
        hasUserData: !!userData, 
        currentAuth: get().isAuthenticated 
      });
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          set({ user, isAuthenticated: true });
          console.log('인증 상태 복원 성공:', user);
          return true;
        } catch (error) {
          console.error('사용자 데이터 파싱 실패:', error);
          // 파싱 실패 시 로그아웃 처리
          get().logout();
          return false;
        }
      } else {
        // 토큰이나 사용자 데이터가 없는 경우 로그아웃 상태로 설정
        console.log('토큰 또는 사용자 데이터 없음, 로그아웃 상태로 설정');
        get().logout();
        return false;
      }
    } catch (error) {
      console.error('checkAuth 실행 중 오류:', error);
      get().logout();
      return false;
    }
  },
})); 