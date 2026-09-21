import { Outlet } from 'react-router-dom';
import { Button, Form, Input, Modal, Space, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { adminApi } from '../api/adminApi';
import { useAuthStore } from '../stores/authStore';
import './AdminLayout.css';

// 后台壳：仅 PC 端体验（PRD 5.3）；视觉与前台区分（深色顶栏）
export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [form] = Form.useForm();

  const submitChangePassword = async (values: {
    oldPassword: string;
    newPassword: string;
    confirm: string;
  }) => {
    if (values.newPassword !== values.confirm) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setPwdLoading(true);
    try {
      await adminApi.changePassword(values.oldPassword, values.newPassword);
      message.success('密码已修改，请重新登录');
      setPwdOpen(false);
      form.resetFields();
      logout();
      navigate('/admin/login', { replace: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : '修改失败');
    } finally {
      setPwdLoading(false);
    }
  };

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
          <Button size="small" ghost onClick={() => setPwdOpen(true)}>
            改密码
          </Button>
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
      <Modal
        title="修改密码"
        open={pwdOpen}
        onCancel={() => setPwdOpen(false)}
        confirmLoading={pwdLoading}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitChangePassword}>
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true }, { min: 8, message: '至少 8 位' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  !v || v === getFieldValue('newPassword')
                    ? Promise.resolve()
                    : Promise.reject(new Error('两次输入不一致')),
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
