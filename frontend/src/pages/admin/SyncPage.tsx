import { useState } from 'react';
import { Alert, Button, Card, message, Typography, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/adminApi';
import { useDocTreeStore } from '../../stores/docTreeStore';

// 整库导出/导入：按名称路径幂等同步，解决本地与线上两套库 id 分叉
export default function SyncPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const loadTree = useDocTreeStore((s) => s.load);

  const doExport = async () => {
    setExporting(true);
    try {
      const payload = await adminApi.exportAll();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `md-viewer-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${payload.items.length} 个节点`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const doImport = async (file: File) => {
    setImporting(true);
    setResult(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const stats = await adminApi.importAll(payload);
      setResult(`新建 ${stats.created} · 更新 ${stats.updated} · 跳过 ${stats.skipped}`);
      message.success('导入完成');
      await loadTree();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '导入失败（请检查文件格式）');
    } finally {
      setImporting(false);
      return false; // 阻止 antd Upload 自动上传
    }
  };

  return (
    <div>
      <Typography.Title level={4} className="page-title">
        导出 / 导入
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="双库同步"
        description="导出整棵文档树为 JSON（按名称路径定位，与节点 id 无关）。导入是幂等的：已存在的同名路径只更新内容，不存在则自动逐级建目录。适合本地与线上两套独立数据库之间搬运内容。"
      />
      <Card size="small">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={() => void doExport()}>
            导出全部
          </Button>
          <Upload accept=".json,application/json" maxCount={1} showUploadList={false} beforeUpload={(f) => doImport(f)}>
            <Button icon={<UploadOutlined />} loading={importing}>
              导入 JSON
            </Button>
          </Upload>
          {result && <Typography.Text type="success">{result}</Typography.Text>}
        </div>
      </Card>
    </div>
  );
}
