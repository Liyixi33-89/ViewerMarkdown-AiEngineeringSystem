import { useEffect, useState } from 'react';
import { Button, Card, Modal, Space, Tabs, Typography, message } from 'antd';
import { DocTree, type DropPosition } from '../../components/DocTree/DocTree';
import { MarkdownViewer } from '../../components/markdown/MarkdownViewer';
import { NameDialog } from '../../components/NameDialog';
import { adminApi } from '../../api/adminApi';
import { useDocTreeStore, type TreeItem } from '../../stores/docTreeStore';
import './DocsPage.css';

type NodeAction = 'rename' | 'delete' | 'newFolder' | 'newDoc';
// 命名弹窗意图：newFolderRoot=根建夹 newDocRoot=根建文档 newFolder/newDoc=树内子节点 rename=重命名
type NameIntent =
  | { kind: 'newFolderRoot' }
  | { kind: 'newDocRoot' }
  | { kind: 'newFolder'; node: TreeItem }
  | { kind: 'newDoc'; node: TreeItem }
  | { kind: 'rename'; node: TreeItem };

// 文档管理页：左侧管理树（CRUD）+ 右侧预览/编辑工作区（原 Dashboard 迁移）
export default function DocsPage() {
  const { load, select, selectedId } = useDocTreeStore();

  const [nameIntent, setNameIntent] = useState<NameIntent | null>(null);
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [activeDoc, setActiveDoc] = useState<{ id: number; name: string; content: string } | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState('');

  useEffect(() => {
    void load(); // 后台强制刷新（含草稿）
  }, [load]);

  useEffect(() => {
    if (selectedId == null) return;
    void (async () => {
      try {
        const nodes = useDocTreeStore.getState().nodes;
        const node = nodes.find((n) => n.id === selectedId);
        if (node?.type === 'DOC') {
          const { adminGetDoc } = await import('../../api/adminApiExtra');
          const doc = await adminGetDoc(selectedId);
          setActiveDoc({ id: selectedId, name: doc.name, content: doc.content });
          setDraftContent(doc.content);
          setEditing(false);
        } else {
          setActiveDoc(null);
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : '加载失败');
      }
    })();
  }, [selectedId]);

  const onTreeSelect = (id: number) => select(id);

  // 拖拽落定：统一走 reorder（同目录排序 / 跨目录拖入），失败刷新回滚
  const onMove = async (dragNode: TreeItem, targetNode: TreeItem, position: DropPosition) => {
    const nodes = useDocTreeStore.getState().nodes;
    // inside=移入目标文件夹（追加末尾）；before/after=插到目标同级指定位置
    const parentId = position === 'inside' ? targetNode.id : targetNode.parentId;
    const parent = nodes.find((n) => n.id === parentId);
    const dragFrom = dragNode.parentId;
    const insertIdx = position === 'before' ? -1 : 1;

    // 构造目标目录重排后的完整 id 序列（含原目录兄弟节点，跨目录则目标侧追加 dragNode）
    const targetSiblings = (parent ? nodes.filter((n) => n.parentId === parentId) : nodes.filter((n) => n.parentId === 0))
      .filter((n) => n.id !== dragNode.id)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, 'zh-CN');
      })
      .map((n) => n.id);

    let orderedIds: number[];
    if (position === 'inside') {
      orderedIds = [...targetSiblings, dragNode.id];
    } else {
      const idx = targetSiblings.indexOf(targetNode.id);
      orderedIds = [
        ...targetSiblings.slice(0, idx + (insertIdx === -1 ? 0 : 1)),
        dragNode.id,
        ...targetSiblings.slice(idx + (insertIdx === -1 ? 0 : 1)),
      ];
    }

    try {
      await adminApi.reorder(parentId, orderedIds);
      message.success(position === 'inside' && dragFrom !== parentId ? `已移入「${targetNode.name}」` : '已保存排序');
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '移动失败');
      await load(); // 失败回滚视图
    }
  };

  const onAction = async (action: NodeAction, node: TreeItem) => {
    try {
      if (action === 'rename') {
        setNameIntent({ kind: 'rename', node });
      } else if (action === 'delete') {
        const count = countSubtree(node);
        Modal.confirm({
          title: '确认删除？',
          content: count > 1 ? `将同时删除 ${count - 1} 个子项，删除后进入回收站。` : '删除后进入回收站。',
          okButtonProps: { danger: true },
          onOk: async () => {
            await adminApi.remove(node.id);
            message.success('已删除');
            if (selectedId === node.id) select(null);
            await load();
          },
        });
      } else if (action === 'newFolder') {
        setNameIntent({ kind: 'newFolder', node });
      } else if (action === 'newDoc') {
        setNameIntent({ kind: 'newDoc', node });
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  // 命名弹窗提交（统一处理 5 种意图）
  const onNameOk = async (name: string) => {
    if (!nameIntent) return;
    setNameSubmitting(true);
    try {
      switch (nameIntent.kind) {
        case 'newFolderRoot':
          await adminApi.createFolder(0, name);
          message.success('已创建文件夹');
          break;
        case 'newDocRoot':
        case 'newDoc': {
          const parentId = nameIntent.kind === 'newDocRoot' ? 0 : nameIntent.node.id;
          const res = await adminApi.createDoc(parentId, name);
          message.success(`已创建：${res.finalName}`);
          await load();
          select(res.id);
          break;
        }
        case 'newFolder':
          await adminApi.createFolder(nameIntent.node.id, name);
          message.success('已创建文件夹');
          break;
        case 'rename':
          await adminApi.rename(nameIntent.node.id, name);
          message.success('已重命名');
          break;
      }
      if (nameIntent.kind !== 'newDocRoot' && nameIntent.kind !== 'newDoc') await load();
      setNameIntent(null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setNameSubmitting(false);
    }
  };

  const onSave = async () => {
    if (!activeDoc) return;
    try {
      await adminApi.saveContent(activeDoc.id, draftContent);
      message.success('已保存');
      setActiveDoc({ ...activeDoc, content: draftContent });
      setEditing(false);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    }
  };

  return (
    <>
      <aside className="docs-sidebar">
        <Space className="docs-toolbar">
          <Button onClick={() => setNameIntent({ kind: 'newDocRoot' })}>新建文档</Button>
          <Button onClick={() => setNameIntent({ kind: 'newFolderRoot' })}>新建文件夹</Button>
        </Space>
        <div className="tree-wrap">
          <DocTree readonly={false} selectedId={selectedId} onSelect={onTreeSelect} onAction={onAction} onMove={onMove} />
        </div>
      </aside>
      <section className="docs-workbench">
        {!activeDoc && <div className="workbench-empty">在左侧选择一篇文档进行管理</div>}
        {activeDoc && (
          <Card
            title={activeDoc.name}
            extra={
              <Space>
                {editing ? (
                  <>
                    <Button onClick={() => setEditing(false)}>取消</Button>
                    <Button type="primary" onClick={onSave}>
                      保存
                    </Button>
                  </>
                ) : (
                  <Button type="primary" onClick={() => setEditing(true)}>
                    编辑内容
                  </Button>
                )}
              </Space>
            }
          >
            <Tabs
              items={[
                {
                  key: 'preview',
                  label: '预览',
                  children: <MarkdownViewer content={editing ? draftContent : activeDoc.content} />,
                },
                {
                  key: 'source',
                  label: editing ? '编辑源码' : '源码',
                  children: editing ? (
                    <Typography.Paragraph>
                      <textarea
                        className="admin-editor"
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                      />
                    </Typography.Paragraph>
                  ) : (
                    <pre className="doc-source doc-source-embedded">
                      {activeDoc.content}
                    </pre>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </section>
      <NameDialog
        open={nameIntent !== null}
        title={
          nameIntent?.kind === 'rename' ? '重命名'
          : nameIntent?.kind === 'newFolderRoot' || nameIntent?.kind === 'newFolder' ? '新建文件夹'
          : '新建文档'
        }
        initialValue={nameIntent?.kind === 'rename' ? nameIntent.node.name : undefined}
        placeholder={nameIntent?.kind.startsWith('newFolder') ? '新建文件夹' : '未命名文档'}
        confirmLoading={nameSubmitting}
        onOk={onNameOk}
        onCancel={() => setNameIntent(null)}
      />
    </>
  );
}

function countSubtree(node: TreeItem): number {
  return 1 + node.children.reduce((acc, c) => acc + countSubtree(c), 0);
}
