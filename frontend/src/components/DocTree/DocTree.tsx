import { useState } from 'react';
import type { TreeItem } from '../../stores/docTreeStore';
import { useDocTreeStore } from '../../stores/docTreeStore';
import { filterTree } from '../../utils/tree';
import { TreeNodeRow } from './TreeNode';
import './DocTree.css';

/** 拖拽落点：before/after=插入目标节点同级前后；inside=移入目标文件夹内部 */
export type DropPosition = 'before' | 'after' | 'inside';

export interface DocTreeProps {
  /** true=前台只读（无操作按钮）；false=后台管理模式 */
  readonly: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** 后台模式：操作回调（右键/悬停按钮触发） */
  onAction?: (action: 'rename' | 'delete' | 'newFolder' | 'newDoc', node: TreeItem) => void;
  /** 后台模式：拖拽落定回调（dragNode 移动到 targetNode 的 position 位置） */
  onMove?: (dragNode: TreeItem, targetNode: TreeItem, position: DropPosition) => void;
}

// 双端复用树组件：readonly props 控制管理能力（技术设计文档 2.1）
export function DocTree({ readonly, selectedId, onSelect, onAction, onMove }: DocTreeProps) {
  const tree = useDocTreeStore((s) => s.tree);
  const loaded = useDocTreeStore((s) => s.loaded);
  const [keyword, setKeyword] = useState('');

  const visible = keyword.trim() ? filterTree(tree, keyword) : tree;

  if (!loaded) return <div className="tree-empty">目录加载中…</div>;
  if (tree.length === 0) {
    return <div className="tree-empty">{readonly ? '暂无文档' : '暂无内容，请先上传或新建'}</div>;
  }

  return (
    <div className="doc-tree">
      <input
        className="tree-filter"
        placeholder="筛选目录…"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      {visible.map((node) => (
        <TreeNodeRow
          key={node.id}
          node={node}
          depth={0}
          readonly={readonly}
          selectedId={selectedId}
          onSelect={onSelect}
          onAction={onAction}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
