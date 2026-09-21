import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { adminApi } from '../../api/adminApi';
import { useAuthStore } from '../../stores/authStore';

// 改密码独立路由页：旧密码校验 + ≥8 位 + 改完强制重登（2026-09-21 从顶栏 Modal 迁出）
export default function PasswordPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: { oldPassword: string; newPassword: string; confirm: string }) => {
    setSubmitting(true);
    try {
      await adminApi.changePassword(values.oldPassword, values.newPassword);
      message.success('密码已修改，请重新登录');
      logout();
      navigate('/admin/login', { replace: true });
    } catch (e) {
      message.error(e instanceof Error ? e.message : '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        修改密码
      </Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="oldPassword" label="旧密码" rules={[{ required: true, message: '请输入旧密码' }]}>
            <Input.Password placeholder="当前登录密码" autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, message: '请输入新密码' }, { min: 8, message: '至少 8 位' }]}
          >
            <Input.Password placeholder="至少 8 位" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({
                validator: (_, v) =>
                  !v || v === getFieldValue('newPassword')
                    ? Promise.resolve()
                    : Promise.reject(new Error('两次输入不一致')),
              }),
            ]}
          >
            <Input.Password placeholder="重复输入新密码" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            确认修改
          </Button>
        </Form>
      </Card>
    </div>
  );
}
