import { lazy, Suspense } from 'react';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import PortalLayout from '../layouts/PortalLayout';
import { reloadOnChunkError } from './adminRouter';

// 前台路由树（公开，不含 antd chunk）
const DocView = lazy(() => reloadOnChunkError(import('../pages/portal/DocView')));
const Home = lazy(() => reloadOnChunkError(import('../pages/portal/Home')));
const portalRouter = createBrowserRouter([
  {
    path: '/',
    element: <PortalLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'doc/:id', element: <DocView /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function PortalApp() {
  return (
    <Suspense fallback={<div className="page-loading">加载中…</div>}>
      <RouterProvider router={portalRouter} />
    </Suspense>
  );
}
