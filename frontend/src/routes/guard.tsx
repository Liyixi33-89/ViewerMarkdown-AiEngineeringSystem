import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { get } from '../api/http';
import { useAuthStore } from '../stores/authStore';
import type { AuthTokens } from '../types/api';

// 后台路由守卫（2026-09-21 cookie 会话版）：
// 刷新后内存态丢失，先调 /auth/me 从 HttpOnly cookie 恢复会话；失败即未登录
export function RequireAuth({ children }: { children: JSX.Element }) {
  const authed = useAuthStore((s) => s.authed);
  const restore = useAuthStore((s) => s.restore);
  const logout = useAuthStore((s) => s.logout);
  const [checking, setChecking] = useState(!authed);

  useEffect(() => {
    if (authed) return;
    let alive = true;
    void (async () => {
      try {
        const user = await get<AuthTokens['user']>('/admin/auth/me');
        if (alive) restore(user);
      } catch {
        if (alive) logout();
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authed, restore, logout]);

  if (authed) return children;
  if (checking) return <div className="page-loading">恢复会话中…</div>;
  return <Navigate to="/admin/login" replace />;
}
