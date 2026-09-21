import { lazy, Suspense } from 'react';
import { Navigate, RouterProvider, createBrowserRouter, useLocation } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { RequireAuth } from './guard';
import { useAuthStore } from '../stores/authStore';

// 后台路由树（懒加载，antd 仅进 admin chunk）
const Login = lazy(() => import('../pages/admin/Login'));
const Overview = lazy(() => import('../pages/admin/Overview'));
const DocsPage = lazy(() => import('../pages/admin/DocsPage'));
const UploadPage = lazy(() => import('../pages/admin/UploadPage'));
const PasswordPage = lazy(() => import('../pages/admin/PasswordPage'));

// 已登录访问 /admin/login 时跳工作台（cookie 会话：authed 标记）
function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const authed = useAuthStore((s) => s.authed);
  const location = useLocation();
  if (authed && location.pathname === '/admin/login') {
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
    children: [
      { index: true, element: <Overview /> },
      { path: 'docs', element: <DocsPage /> },
      { path: 'upload', element: <UploadPage /> },
      { path: 'password', element: <PasswordPage /> },
    ],
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
