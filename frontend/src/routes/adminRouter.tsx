import { lazy, Suspense } from 'react';
import { Navigate, RouterProvider, createBrowserRouter, useLocation } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import { RequireAuth } from './guard';
import { useAuthStore } from '../stores/authStore';

// 部署后旧 chunk 404 兜底：动态 import 失败说明页面引用的是部署前的旧文件名，
// 刷新整页让浏览器重新解析最新 index.html 的 chunk 清单（index.html 协商缓存 no-cache 保证拿到新版）
export function reloadOnChunkError<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    // Vite 动态 import 失败特征：Failed to fetch dynamically imported module / Loading chunk xxx failed
    if (msg.includes('dynamically imported') || msg.includes('Loading chunk') || msg.includes('Importing a module script failed')) {
      window.location.reload();
      // 返回永不 resolve 的 Promise，阻断错误冒泡（页面即将整刷）
      return new Promise<T>(() => {});
    }
    throw err;
  });
}

// 后台路由树（懒加载，antd 仅进 admin chunk）
const Login = lazy(() => reloadOnChunkError(import('../pages/admin/Login')));
const Overview = lazy(() => reloadOnChunkError(import('../pages/admin/Overview')));
const DocsPage = lazy(() => reloadOnChunkError(import('../pages/admin/DocsPage')));
const UploadPage = lazy(() => reloadOnChunkError(import('../pages/admin/UploadPage')));
const PasswordPage = lazy(() => reloadOnChunkError(import('../pages/admin/PasswordPage')));

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
