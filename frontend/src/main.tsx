import { createRoot } from 'react-dom/client';
import { AdminApp } from './routes/adminRouter';
import { PortalApp } from './routes/portalRouter';
import './styles/global.css';

// 双路由域单入口：按路径挂载对应应用（/admin 与 /），两个 RouterProvider 分包互不影响
const path = window.location.pathname;
const is_admin = path === '/admin' || path.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  is_admin ? <AdminApp /> : <PortalApp />,
);
