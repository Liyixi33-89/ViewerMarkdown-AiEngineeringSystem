import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TreeNode } from '../types/api';
import { portalApi } from '../api/portalApi';
import { buildTree, findPath } from '../utils/tree';

export interface TreeItem extends TreeNode {
  children: TreeItem[];
}

interface DocTreeState {
  /** 后端扁平列表 */
  nodes: TreeNode[];
  tree: TreeItem[];
  selectedId: number | null;
  /** 展开的文件夹 id 集合（持久化） */
  expandedIds: number[];
  loaded: boolean;
  load: () => Promise<void>;
  select: (id: number | null) => void;
  isExpanded: (id: number) => boolean;
  toggleExpand: (id: number) => void;
  /** 选中节点的祖先链路径 */
  pathOf: (id: number) => TreeItem[];
}

// 树数据与选中/折叠态（技术设计文档 2.4）
export const useDocTreeStore = create<DocTreeState>()(
  persist(
    (set, get) => ({
      nodes: [],
      tree: [],
      selectedId: null,
      expandedIds: [],
      loaded: false,

      load: async () => {
        const nodes = await portalApi.getTree();
        set({ nodes, tree: buildTree(nodes), loaded: true });
      },

      select: (selectedId) => set({ selectedId }),

      isExpanded: (id) => get().expandedIds.includes(id),

      toggleExpand: (id) => {
        const { expandedIds } = get();
        set({
          expandedIds: expandedIds.includes(id)
            ? expandedIds.filter((x) => x !== id)
            : [...expandedIds, id],
        });
      },

      pathOf: (id) => findPath(get().tree, id),
    }),
    {
      name: 'mdv-tree',
      partialize: (s) => ({ selectedId: s.selectedId, expandedIds: s.expandedIds }),
    },
  ),
);
