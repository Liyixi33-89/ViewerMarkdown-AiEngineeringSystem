import { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';

// 受控命名弹窗：新建文件夹 / 新建文档 / 重命名共用（skill: antd-component-first）
export function NameDialog({
  open,
  title,
  initialValue,
  maxLength = 100,
  placeholder,
  confirmLoading = false,
  onOk,
  onCancel,
}: {
  open: boolean;
  title: string;
  initialValue?: string;
  maxLength?: number;
  placeholder?: string;
  confirmLoading?: boolean;
  onOk: (name: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
      if (initialValue) form.setFieldsValue({ name: initialValue });
    }
  }, [open, initialValue, form]);

  return (
    <Modal
      open={open}
      title={title}
      okText="确定"
      cancelText="取消"
      confirmLoading={confirmLoading}
      onOk={async () => {
        const values = await form.validateFields();
        await onOk(values.name.trim());
      }}
      onCancel={onCancel}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="名称"
          rules={[
            { required: true, message: '请输入名称' },
            { max: maxLength, message: `不超过 ${maxLength} 字` },
          ]}
        >
          <Input placeholder={placeholder ?? '请输入名称'} maxLength={maxLength} showCount autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  );
}
