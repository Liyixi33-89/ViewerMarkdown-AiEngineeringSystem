import { create } from 'zustand';
import type { AuthTokens } from '../types/api';

interface AuthState {
  /** 会话标记：true 表示已通过 cookie 会话认证（token 本体在 HttpOnly cookie，前端不可见） */
  authed: boolean;
  user: AuthTokens['user'] | null;
  setAuth: (t: AuthTokens) => void;
  /** 从 /auth/me 恢复的会话 */
  restore: (user: AuthTokens['user']) => void;
  logout: () => void;
}

// 后台登录态（2026-09-21 cookie 会话改造）：
// - 不再持久化任何 token（HttpOnly cookie 由浏览器管理，24h 有效期）
// - 刷新后 RequireAuth 先走 /auth/me 恢复；恢复失败即未登录
export const useAuthStore = create<AuthState>()((set) => ({
  authed: false,
  user: null,
  setAuth: ({ user }) => set({ authed: true, user }),
  restore: (user) => set({ authed: true, user }),
  logout: () => set({ authed: false, user: null }),
}));
