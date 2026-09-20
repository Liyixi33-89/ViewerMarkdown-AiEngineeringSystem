import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens } from '../types/api';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthTokens['user'] | null;
  setAuth: (t: AuthTokens) => void;
  logout: () => void;
}

// 后台登录态；持久化到 localStorage（技术设计文档 2.4）
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'mdv-auth' },
  ),
);
