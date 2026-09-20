import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

// 后台路由守卫：无 token 一律重定向登录页（技术设计文档 2.2）
export function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}
