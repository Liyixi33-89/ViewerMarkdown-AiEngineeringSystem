import { get } from './http';
import type { DocContent, SearchHit, TreeNode } from '../types/api';

// 前台公开只读接口（无鉴权）
export const portalApi = {
  /** 完整目录树（仅 PUBLISHED 且未删除，扁平数组前端组树） */
  getTree: () => get<TreeNode[]>('/portal/tree'),

  /** 文档正文（含面包屑） */
  getDocContent: (id: number) => get<DocContent>(`/portal/docs/${id}/content`),

  /** 名称搜索（M2 扩展全文 scope=content） */
  search: (keyword: string, scope: 'name' | 'content' = 'name') =>
    get<SearchHit[]>('/portal/search', { keyword, scope }),

  /** 数据版本时间戳（轮询同步用） */
  getVersion: () => get<{ version: number }>('/portal/version'),
};
