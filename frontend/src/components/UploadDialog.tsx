import { useEffect, useState } from 'react';
import { Input, Modal, Select, Tabs, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { adminApi } from '../api/adminApi';
import { useDocTreeStore } from '../stores/docTreeStore';

// 上传对话框：文件 Tab（多选 .md）/ 粘贴 Tab（实时预览）（PRD 4.4）
export function UploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
}) {
  const nodes = useDocTreeStore((s) => s.nodes);

  const folders = nodes.filter((n) => n.type === 'FOLDER');
  const [parentId, setParentId] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setText('');
      setParentId(0);
    }
  }, [open]);

  // 粘贴内容实时预览（懒加载，避免 portal chunk 依赖）
  const [MarkdownViewerLazy, setViewer] = useState<React.ComponentType<{ content: string }> | null>(
    null,
  );
  useEffect(() => {
    void import('./markdown/MarkdownViewer').then((m) => setViewer(() => m.MarkdownViewer));
  }, []);

  const submitFiles = async (files: File[]) => {
    const valid = files.filter((f) => /\.(md|markdown)$/i.test(f.name));
    if (valid.length !== files.length) {
      message.warning('仅支持 .md / .markdown 文件，已自动过滤其他类型');
    }
    if (valid.length === 0) return;
    setUploading(true);
    try {
      const results = await adminApi.uploadFiles(valid, parentId);
      message.success(`成功上传 ${results.length} 个文档`);
      await onUploaded();
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const submitText = async () => {
    if (!title.trim() || !text.trim()) {
      message.warning('标题与内容均为必填');
      return;
    }
    setUploading(true);
    try {
      const res = await adminApi.uploadText(title.trim(), text, parentId);
      message.success(`已保存：${res.finalName}`);
      await onUploaded();
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setUploading(false);
    }
  };

  const parentSelect = (
    <Select
      value={parentId}
      onChange={setParentId}
      style={{ width: '100%' }}
      options={[{ value: 0, label: '根目录' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
    />
  );

  return (
    <Modal
      open={open}
      title="上传文档"
      onCancel={onClose}
      okText="保存"
      cancelButtonProps={{ hidden: true }}
      footer={null}
      width={720}
      destroyOnClose
    >
      <Tabs
        items={[
          {
            key: 'file',
            label: '文件上传',
            children: (
              <div>
                <p style={{ color: 'var(--text-soft)', fontSize: 12 }}>目标目录</p>
                {parentSelect}
                <Upload.Dragger
                  multiple
                  accept=".md,.markdown"
                  showUploadList={false}
                  customRequest={({ file }) => void submitFiles([file as unknown as File])}
                  disabled={uploading}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">点击或拖入 .md 文件（支持多选）</p>
                  <p className="ant-upload-hint">单文件 ≤ 2MB，UTF-8 编码</p>
                </Upload.Dragger>
              </div>
            ),
          },
          {
            key: 'text',
            label: '粘贴文本',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Input
                  placeholder="文档标题（默认取首个 # 标题）"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {parentSelect}
                <textarea
                  className="admin-editor"
                  style={{ minHeight: 160 }}
                  placeholder="粘贴 Markdown 文本…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                {text.trim() && MarkdownViewerLazy && (
                  <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <MarkdownViewerLazy content={text} />
                  </div>
                )}
                <button className="btn btn-primary" onClick={submitText} disabled={uploading}>
                  保存
                </button>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
