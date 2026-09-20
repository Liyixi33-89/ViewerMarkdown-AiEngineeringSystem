import { lazy, Suspense } from 'react';
import { Navigate, RouterProvider, createBrowserRouter, useLocation } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { RequireAuth } from './guard';
import { useAuthStore } from '../stores/authStore';

// 后台路由树（懒加载，antd 仅进 admin chunk）
const Login = lazy(() => import('../pages/admin/Login'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));

// 已登录访问 /admin/login 时跳工作台
function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.accessToken);
  const location = useLocation();
  if (token && location.pathname === '/admin/login') {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

const adminRouter = createBrowserRouter([
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <Dashboard /> }],
  },
  {
    path: '/admin/login',
    element: (
      <RedirectIfAuthed>
        <Login />
      </RedirectIfAuthed>
    ),
  },
]);

export function AdminApp() {
  return (
    <Suspense fallback={<div className="page-loading">加载中…</div>}>
      <RouterProvider router={adminRouter} />
    </Suspense>
  );
}
