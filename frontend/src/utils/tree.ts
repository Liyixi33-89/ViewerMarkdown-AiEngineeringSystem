import type { TreeNode } from '../types/api';
import type { TreeItem } from '../stores/docTreeStore';

// 扁平列表 -> 树；排序：文件夹在前、sortOrder 次之、名称
export function buildTree(nodes: TreeNode[]): TreeItem[] {
  const map = new Map<number, TreeItem>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));

  const roots: TreeItem[] = [];
  map.forEach((item) => {
    const parent = map.get(item.parentId);
    if (parent) parent.children.push(item);
    else roots.push(item);
  });

  const sortFn = (a: TreeItem, b: TreeItem) => {
    if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'zh-CN');
  };

  const dfs = (list: TreeItem[]) => {
    list.sort(sortFn);
    list.forEach((n) => dfs(n.children));
  };
  dfs(roots);
  return roots;
}

/** 从根到目标节点的路径（面包屑/自动展开用），未命中返回 [] */
export function findPath(tree: TreeItem[], id: number): TreeItem[] {
  for (const node of tree) {
    if (node.id === id) return [node];
    const sub = findPath(node.children, id);
    if (sub.length) return [node, ...sub];
  }
  return [];
}

/** 树内筛选：命中节点的祖先链全部保留并展开 */
export function filterTree(tree: TreeItem[], keyword: string): TreeItem[] {
  if (!keyword.trim()) return tree;
  const kw = keyword.trim().toLowerCase();
  const walk = (list: TreeItem[]): TreeItem[] =>
    list
      .map((node) => {
        const children = walk(node.children);
        const hit = node.name.toLowerCase().includes(kw);
        if (hit || children.length) return { ...node, children: hit ? node.children : children };
        return null;
      })
      .filter((x): x is TreeItem => x !== null);
  return walk(tree);
}
