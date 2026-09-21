import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import { FileTextOutlined, LockOutlined, LogoutOutlined, UploadOutlined, DashboardOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { adminApi } from '../api/adminApi';
import { useAuthStore } from '../stores/authStore';

const { Header, Sider, Content } = Layout;

// 后台壳：左侧导航（路由页划分）+ 顶栏（PRD 5.3）；视觉与前台区分（深色顶栏）
// 改密码已迁为独立路由页 /admin/password（2026-09-21）
const NAV_ITEMS = [
  { key: '/admin', icon: <DashboardOutlined />, label: '概览' },
  { key: '/admin/docs', icon: <FileTextOutlined />, label: '文档管理' },
  { key: '/admin/upload', icon: <UploadOutlined />, label: '上传入库' },
  { key: '/admin/password', icon: <LockOutlined />, label: '改密码' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isDocs = location.pathname === '/admin/docs';

  return (
    <Layout style={{ height: '100%' }}>
      <Header
        style={{
          background: '#001529',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          height: 56,
          lineHeight: '56px',
        }}
      >
        <span className="admin-topbar-logo">
          🛠 MD Viewer 管理中心
        </span>
        <div style={{ flex: 1 }} />
        <Space size={12}>
          <Button
            size="small"
            type="text"
            style={{ color: 'rgba(255,255,255,.75)' }}
            onClick={() => window.open('/', '_blank')}
          >
            前台预览
          </Button>
          <Typography.Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>
            {user?.username ?? ''}
          </Typography.Text>
          <Button
            size="small"
            type="text"
            icon={<LogoutOutlined />}
            style={{ color: 'rgba(255,255,255,.75)' }}
            onClick={() => {
              void adminApi.logout().catch(() => undefined); // 清服务端 cookie（失败不阻塞）
              logout();
              message.success('已退出');
              navigate('/admin/login', { replace: true });
            }}
          >
            退出
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={180} theme="light" style={{ borderRight: '1px solid var(--border)' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={NAV_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 'none', paddingTop: 8 }}
          />
        </Sider>
        <Content
          style={{
            minHeight: 0,
            overflow: 'auto',
            padding: isDocs ? 0 : '16px 24px',
            ...(isDocs ? { display: 'flex', minWidth: 0 } : null),
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
