import { Outlet } from 'react-router-dom';
import { Button, Space, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './AdminLayout.css';

// 后台壳：仅 PC 端体验（PRD 5.3）；视觉与前台区分（深色顶栏）
export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="admin-layout">
      <header className="admin-topbar">
        <span className="logo">🛠 MD Viewer 管理中心</span>
        <div className="spacer" />
        <Space>
          <Button size="small" ghost onClick={() => window.open('/', '_blank')}>
            前台预览
          </Button>
          <Typography.Text style={{ color: 'rgba(255,255,255,.65)', fontSize: 12 }}>
            {user?.username ?? ''}
          </Typography.Text>
          <Button
            size="small"
            danger
            onClick={() => {
              logout();
              message.success('已退出');
              navigate('/admin/login', { replace: true });
            }}
          >
            退出
          </Button>
        </Space>
      </header>
      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}
