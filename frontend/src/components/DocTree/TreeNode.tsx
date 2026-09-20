import { useState } from 'react';
import type { TreeItem } from '../../stores/docTreeStore';
import { useDocTreeStore } from '../../stores/docTreeStore';
import type { DocTreeProps } from './DocTree';

// 单个树节点：箭头展开、图标、名称；后台模式显示操作按钮
export function TreeNodeRow({
  node,
  depth,
  readonly,
  selectedId,
  onSelect,
  onAction,
}: {
  node: TreeItem;
  depth: number;
  readonly: boolean;
  selectedId: number | null;
  onSelect: DocTreeProps['onSelect'];
  onAction?: DocTreeProps['onAction'];
}) {
  const isExpanded = useDocTreeStore((s) => s.isExpanded(node.id));
  const toggleExpand = useDocTreeStore((s) => s.toggleExpand);
  const [menuOpen, setMenuOpen] = useState(false);

  const isFolder = node.type === 'FOLDER';
  const selected = selectedId === node.id;

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

  return (
    <div>
      <div
        className={`tree-node${selected ? ' selected' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={onRowClick}
        onContextMenu={onContextMenu}
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
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
