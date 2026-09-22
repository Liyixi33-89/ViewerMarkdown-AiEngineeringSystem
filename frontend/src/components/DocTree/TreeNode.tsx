import { useState } from 'react';
import type { TreeItem } from '../../stores/docTreeStore';
import { useDocTreeStore } from '../../stores/docTreeStore';
import type { DocTreeProps, DropPosition } from './DocTree';

// 模块级拖拽态：同一棵树内部拖拽，无需跨组件传递，dragend/drop 后清空
let draggingNode: TreeItem | null = null;

/** target 是否是 ancestor 的自身或后代（防止拖拽落到自己子树里造成环） */
function isSelfOrDescendant(ancestor: TreeItem, target: TreeItem): boolean {
  if (ancestor.id === target.id) return true;
  return ancestor.children.some((c) => isSelfOrDescendant(c, target));
}

// 单个树节点：箭头展开、图标、名称；后台模式显示操作按钮 + 拖拽排序/移动
export function TreeNodeRow({
  node,
  depth,
  readonly,
  selectedId,
  onSelect,
  onAction,
  onMove,
}: {
  node: TreeItem;
  depth: number;
  readonly: boolean;
  selectedId: number | null;
  onSelect: DocTreeProps['onSelect'];
  onAction?: DocTreeProps['onAction'];
  onMove?: DocTreeProps['onMove'];
}) {
  const isExpanded = useDocTreeStore((s) => s.isExpanded(node.id));
  const toggleExpand = useDocTreeStore((s) => s.toggleExpand);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);

  const isFolder = node.type === 'FOLDER';
  const selected = selectedId === node.id;
  const draggable = !readonly && !!onMove;

  const onRowClick = () => {
    if (isFolder) {
      toggleExpand(node.id);
    } else {
      onSelect(node.id);
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    if (readonly || !onAction) return;
    e.preventDefault();
    setMenuOpen((v) => !v);
  };

  const onDragStart = (e: React.DragEvent) => {
    draggingNode = node;
    e.dataTransfer.effectAllowed = 'move';
    // Firefox 需要显式 setData 才会真正触发拖拽流程
    e.dataTransfer.setData('text/plain', String(node.id));
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!draggable || !draggingNode || draggingNode.id === node.id) return;
    if (isSelfOrDescendant(draggingNode, node)) return; // 禁止落到自身子树
    e.preventDefault();
    // 按行内垂直位置三分：上 1/4 = before，下 1/4 = after，中间 = inside（仅文件夹允许）
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    const position: DropPosition =
      ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : isFolder ? 'inside' : ratio < 0.5 ? 'before' : 'after';
    setDropPosition(position);
  };

  const onDragLeave = () => setDropPosition(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const drag = draggingNode;
    const position = dropPosition;
    setDropPosition(null);
    draggingNode = null;
    if (!drag || !position || drag.id === node.id) return;
    if (isSelfOrDescendant(drag, node)) return;
    onMove?.(drag, node, position);
  };

  const onDragEnd = () => {
    draggingNode = null;
    setDropPosition(null);
  };

  return (
    <div>
      <div
        className={`tree-node${selected ? ' selected' : ''}${dropPosition ? ` drop-${dropPosition}` : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={onRowClick}
        onContextMenu={onContextMenu}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        <span
          className={`arrow${isFolder ? (isExpanded ? ' expanded' : '') : ' placeholder'}`}
          onClick={(e) => {
            if (isFolder) {
              e.stopPropagation();
              toggleExpand(node.id);
            }
          }}
        >
          ▶
        </span>
        <span className="node-icon">{isFolder ? (isExpanded ? '📂' : '📁') : '📄'}</span>
        <span className="node-name" title={node.name}>
          {node.name}
        </span>
        {!readonly && onAction && (
          <span className="node-actions" onClick={(e) => e.stopPropagation()}>
            {isFolder && (
              <>
                <button title="新建子文件夹" onClick={() => onAction('newFolder', node)}>
                  ＋
                </button>
                <button title="新建文档" onClick={() => onAction('newDoc', node)}>
                  📄
                </button>
              </>
            )}
            <button title="重命名" onClick={() => onAction('rename', node)}>
              ✏️
            </button>
            <button title="删除" onClick={() => onAction('delete', node)}>
              🗑
            </button>
          </span>
        )}
      </div>

      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 30 }}
          onClick={() => setMenuOpen(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(false);
          }}
        />
      )}

      {isFolder && isExpanded && (
        <div>
          {node.children.length === 0 ? (
            <div className="tree-empty" style={{ fontSize: 12, padding: '4px 0 4px 42px' }}>
              （空）
            </div>
          ) : (
            node.children.map((child) => (
              <TreeNodeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                readonly={readonly}
                selectedId={selectedId}
                onSelect={onSelect}
                onAction={onAction}
                onMove={onMove}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
