import { create } from 'zustand';
import { User } from '../types';
import useAlertStore from './uiStore';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  initialized: boolean; // 인증 상태 확인 완료 여부
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('access_token'),
  initialized: false,
  login: (token, user) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token_type', 'Bearer');
    set({ isAuthenticated: true, user, token });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_type');
    set({ user: null, isAuthenticated: false, token: null });

    useAlertStore.getState().openAlert(
      '로그아웃',
      '성공적으로 로그아웃되었습니다. 로그인 페이지로 이동합니다.',
      () => {
        window.location.href = '/login';
      }
    );
  },
  checkAuth: () => {
    try {
      const token = localStorage.getItem('access_token');
      const userString = localStorage.getItem('user');
      if (token && userString) {
        set({ isAuthenticated: true, user: JSON.parse(userString), token });
      } else {
        set({ isAuthenticated: false, user: null, token: null });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      set({ isAuthenticated: false, user: null, token: null });
    } finally {
      set({ initialized: true });
    }
  },
})); 