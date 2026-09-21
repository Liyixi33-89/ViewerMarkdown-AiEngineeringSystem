import { useEffect, useRef, useState } from 'react';
import { Button, Card, Input, Select, Space, Tabs, Typography, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/adminApi';
import { useDocTreeStore } from '../../stores/docTreeStore';
import './UploadPage.css';

// 上传入库页：批量 .md 文件 / 粘贴文本（PRD 4.4，从 Dashboard 弹窗迁出为独立路由页）
export default function UploadPage() {
  const { load, nodes } = useDocTreeStore();
  const folders = nodes.filter((n) => n.type === 'FOLDER');

  const [parentId, setParentId] = useState(0);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  /** 已入库记录：{ seq 序号（稳定 key）, text 展示行 } */
  const [result, setResult] = useState<{ seq: number; text: string }[]>([]);
  const seqRef = useRef(0);

  useEffect(() => {
    void load();
  }, [load]);

  // 粘贴预览（懒加载 MarkdownViewer）
  const [Viewer, setViewer] = useState<React.ComponentType<{ content: string }> | null>(null);
  useEffect(() => {
    void import('../../components/markdown/MarkdownViewer').then((m) => setViewer(() => m.MarkdownViewer));
  }, []);

  const appendResult = (lines: string[]) =>
    setResult((r) => [...lines.map((text) => ({ seq: seqRef.current++, text })), ...r]);

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
      appendResult(results.map((x) => `📄 ${x.finalName}`));
      await load();
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
      appendResult([`📄 ${res.finalName}`]);
      setTitle('');
      setText('');
      await load();
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
      className="upload-parent-select"
      options={[{ value: 0, label: '根目录' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
    />
  );

  return (
    <div className="upload-page">
      <Typography.Title level={4} className="page-title">
        上传入库
      </Typography.Title>
      <Card>
        <Tabs
          items={[
            {
              key: 'file',
              label: '文件上传',
              children: (
                <div>
                  <p className="upload-hint">目标目录</p>
                  {parentSelect}
                  <Upload.Dragger
                    multiple
                    accept=".md,.markdown"
                    showUploadList={false}
                    customRequest={({ file }) => void submitFiles([file as unknown as File])}
                    disabled={uploading}
                    className="upload-dragger"
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
                <div className="upload-text-pane">
                  <Input
                    placeholder="文档标题（默认取首个 # 标题）"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {parentSelect}
                  <textarea
                    className="admin-editor upload-text-editor"
                    placeholder="粘贴 Markdown 文本…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                  {text.trim() && Viewer && (
                    <div className="upload-text-preview">
                      <Viewer content={text} />
                    </div>
                  )}
                  <Space>
                    <Button type="primary" onClick={submitText} loading={uploading}>
                      保存
                    </Button>
                    <Button
                      onClick={() => {
                        setTitle('');
                        setText('');
                      }}
                    >
                      清空
                    </Button>
                  </Space>
                </div>
              ),
            },
          ]}
        />
      </Card>
      {result.length > 0 && (
        <Card size="small" title="本次会话已入库" className="upload-result-card">
          {result.map((line) => (
            <Typography.Text key={line.seq} className="upload-result-line">
              {line.text}
            </Typography.Text>
          ))}
        </Card>
      )}
    </div>
  );
}
