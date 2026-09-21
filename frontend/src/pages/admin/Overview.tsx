import { useEffect } from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import { useDocTreeStore } from '../../stores/docTreeStore';
import './Overview.css';

// 概览页：文档统计 + 快捷说明
export default function Overview() {
  const { load, nodes } = useDocTreeStore();

  useEffect(() => {
    void load();
  }, [load]);

  const docs = nodes.filter((n) => n.type === 'DOC');
  const folders = nodes.filter((n) => n.type === 'FOLDER');

  return (
    <div>
      <Typography.Title level={4} className="page-title">
        概览
      </Typography.Title>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="文档总数"
              value={docs.length}
              prefix={<FileTextOutlined className="stat-icon stat-icon-doc" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="文件夹总数"
              value={folders.length}
              prefix={<FolderOutlined className="stat-icon stat-icon-folder" />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="节点总数"
              value={nodes.length}
              prefix={<FileTextOutlined className="stat-icon stat-icon-total" />}
            />
          </Card>
        </Col>
      </Row>
      <Card size="small" className="overview-tip-card">
        <Typography.Text type="secondary">
          左侧导航：文档管理（树形 CRUD + 内容编辑）、上传入库（批量 .md 文件 / 粘贴文本）。
          前台改动约 10 秒内自动同步。
        </Typography.Text>
      </Card>
    </div>
  );
}
