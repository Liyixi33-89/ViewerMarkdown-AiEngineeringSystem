import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, message, Modal, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, RedoOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi, type RecycleItem } from '../../api/adminApi';

// 回收站：整树删除折叠为顶层条目（isRoot），恢复回原目录（父目录已删则回落根目录）
export default function RecyclePage() {
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await adminApi.getRecycle());
    } catch (e) {
      message.error(e instanceof Error ? e.message : '加载回收站失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const roots = useMemo(() => items.filter((it) => it.isRoot), [items]);
  const subtreeCount = useCallback(
    (item: RecycleItem) => items.filter((it) => it.path.startsWith(item.path) && it.id !== item.id).length,
    [items],
  );

  const restore = async (item: RecycleItem) => {
    try {
      const res = await adminApi.restore(item.id);
      message.success(`已恢复「${item.name}」（回到${res.parentId === 0 ? '根目录' : '原目录'}）`);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '恢复失败');
    }
  };

  const purge = (item: RecycleItem) => {
    Modal.confirm({
      title: '彻底删除',
      content: `「${item.name}」及其子节点将被永久删除，不可恢复。确定继续？`,
      okButtonProps: { danger: true },
      okText: '彻底删除',
      cancelText: '取消',
      onOk: async () => {
        setPurging(item.id);
        try {
          await adminApi.purge(item.id);
          message.success(`已彻底删除「${item.name}」`);
          await load();
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败');
        } finally {
          setPurging(null);
        }
      },
    });
  };

  const columns: ColumnsType<RecycleItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (_, item) => (
        <Space>
          {item.type === 'FOLDER' ? <Tag color="blue">文件夹</Tag> : <Tag color="green">文档</Tag>}
          <span>{item.name}</span>
        </Space>
      ),
    },
    {
      title: '包含节点',
      key: 'count',
      width: 110,
      render: (_, item) => {
        const n = subtreeCount(item);
        return n > 0 ? <span>{n + 1} 个节点</span> : <span>1 个节点</span>;
      },
    },
    {
      title: '删除时间',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      width: 190,
      render: (v?: string) => (v ? v.replace('T', ' ').slice(0, 19) : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 170,
      render: (_, item) => (
        <Space>
          <Button size="small" icon={<RedoOutlined />} onClick={() => void restore(item)}>
            恢复
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            loading={purging === item.id}
            onClick={() => purge(item)}
          >
            彻底删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} className="page-title">
        回收站
      </Typography.Title>
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={roots}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="回收站是空的：删除的文档会先进入回收站，可随时恢复"
            />
          ),
        }}
      />
    </div>
  );
}
