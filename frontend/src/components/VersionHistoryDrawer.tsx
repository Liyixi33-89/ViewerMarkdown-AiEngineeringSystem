import { useCallback, useEffect, useState } from 'react';
import { Button, Descriptions, Drawer, Empty, List, message, Modal, Skeleton, Space, Tag, Typography } from 'antd';
import { HistoryOutlined, RollbackOutlined } from '@ant-design/icons';
import { adminApi, type VersionItem } from '../api/adminApi';

interface Props {
  open: boolean;
  docId: number | null;
  docName: string;
  onClose: () => void;
  /** 回滚成功后回调（父组件刷新当前文档内容） */
  onRolledBack: () => void;
}

// 版本历史抽屉：列表（摘要）→ 查看（全文对比预览）→ 回滚（二次确认）
export function VersionHistoryDrawer({ open, docId, docName, onClose, onRolledBack }: Props) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<{ id: number; name: string; content: string } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (docId == null) return;
    setLoading(true);
    try {
      setVersions(await adminApi.listVersions(docId));
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载版本历史失败');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const viewVersion = async (item: VersionItem) => {
    if (docId == null) return;
    setViewLoading(true);
    setViewing({ id: item.id, name: item.name ?? '', content: '' });
    try {
      const v = await adminApi.getVersion(docId, item.id);
      setViewing({ id: v.id, name: v.name ?? '', content: v.content });
    } catch (e) {
      message.error(e instanceof Error ? e.message : '读取版本失败');
      setViewing(null);
    } finally {
      setViewLoading(false);
    }
  };

  const confirmRollback = (item: VersionItem) => {
    if (docId == null) return;
    Modal.confirm({
      title: '回滚到此版本',
      content: `将把「${docName}」的内容回滚为该历史版本（当前内容会自动存入历史，可再次回滚撤销）。`,
      okText: '回滚',
      cancelText: '取消',
      onOk: async () => {
        setRollingBackId(item.id);
        try {
          await adminApi.rollback(docId, item.id);
          message.success('已回滚');
          onRolledBack();
          await load();
        } catch (e) {
          message.error(e instanceof Error ? e.message : '回滚失败');
        } finally {
          setRollingBackId(null);
        }
      },
    });
  };

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>版本历史：{docName}</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={520}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : versions.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无历史版本：每次保存内容（内容有实质变化时）会自动存一条快照，保留最近 20 版"
        />
      ) : (
        <List
          dataSource={versions}
          rowKey="id"
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button key="view" size="small" onClick={() => void viewVersion(item)}>
                  查看
                </Button>,
                <Button
                  key="rollback"
                  size="small"
                  icon={<RollbackOutlined />}
                  loading={rollingBackId === item.id}
                  onClick={() => confirmRollback(item)}
                >
                  回滚到此版
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space size={8}>
                    <span>{item.name || '(未命名)'}</span>
                    <Tag>{item.length} 字符</Tag>
                  </Space>
                }
                description={
                  <>
                    <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
                      {item.createdAt ? item.createdAt.replace('T', ' ').slice(0, 19) : '-'}
                    </div>
                    <Typography.Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 0, marginTop: 4, fontSize: 12 }}
                      type="secondary"
                    >
                      {item.preview}
                    </Typography.Paragraph>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        title={viewing ? `历史版本内容：${viewing.name}` : '历史版本内容'}
        open={viewing !== null}
        onCancel={() => setViewing(null)}
        footer={null}
        width="min(860px, 92vw)"
        styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
      >
        {viewLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : (
          <Descriptions size="small" column={1} style={{ marginBottom: 12 }}>
            <Descriptions.Item label="内容全文">
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: 'var(--bg-2, #f6f8fa)',
                  padding: 12,
                  borderRadius: 8,
                  maxHeight: '56vh',
                  overflow: 'auto',
                  fontSize: 12.5,
                  margin: 0,
                }}
              >
                {viewing?.content}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Drawer>
  );
}
