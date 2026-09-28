import { del, get, post, put } from './http';
import type { AuthTokens, TreeNode } from '../types/api';

// 回收站条目（isRoot=false 的条目是整树删除的内部节点，仅用于计数）
export interface RecycleItem {
  id: number;
  parentId: number;
  name: string;
  type: 'FOLDER' | 'DOC';
  path: string;
  deletedAt?: string;
  isRoot: boolean;
}

// 整库导出格式（名称路径定位，与自增 id 解耦）
export interface ExportItem {
  namePath: string;
  folder: boolean;
  sortOrder: number;
  status: number;
  content?: string | null;
  updatedAt?: string | null;
}

export interface ExportPayload {
  version: string;
  exportedAt: number;
  items: ExportItem[];
}

export interface ImportStats {
  created: number;
  updated: number;
  skipped: number;
}

// 版本历史条目（列表摘要，content 需单独调 getVersion）
export interface VersionItem {
  id: number;
  name: string | null;
  length: number;
  preview: string;
  createdAt?: string;
  createdBy?: number | null;
}

// 后台管理接口（JWT 鉴权）
export const adminApi = {
  // ---- 认证 ----
  login: (username: string, password: string) =>
    post<AuthTokens>('/admin/auth/login', { username, password }),

  /** 登出：后端清 cookie（2026-09-21 cookie 会话） */
  logout: () => post<void>('/admin/auth/logout'),

  /** 修改密码（安全加固 2026-09-21） */
  changePassword: (oldPassword: string, newPassword: string) =>
    post<void>('/admin/auth/change-password', { oldPassword, newPassword }),

  // ---- 管理树 ----
  getTree: () => get<TreeNode[]>('/admin/tree'),

  createFolder: (parentId: number, name: string) =>
    post<{ id: number; finalName: string }>('/admin/nodes/folder', { parentId, name }),

  createDoc: (parentId: number, name: string, content?: string) =>
    post<{ id: number; finalName: string }>('/admin/nodes/doc', { parentId, name, content }),

  rename: (id: number, name: string) =>
    put<void>(`/admin/nodes/${id}/name`, { name }),

  saveContent: (id: number, content: string, name?: string) =>
    put<void>(`/admin/nodes/${id}/content`, { content, name }),

  /** 移动/排序：sortOrder 省略时后端自动追加到目标目录末尾 */
  move: (id: number, targetParentId: number, sortOrder?: number) =>
    put<void>(`/admin/nodes/${id}/move`, { targetParentId, sortOrder }),

  /** 批量重排：orderedIds 为目标目录下重排后的完整子节点序列（支持拖入外部节点） */
  reorder: (parentId: number, orderedIds: number[]) =>
    put<void>('/admin/nodes/order', { parentId, orderedIds }),

  remove: (id: number) => del<void>(`/admin/nodes/${id}`),

  // ---- 回收站 ----
  getRecycle: () => get<RecycleItem[]>('/admin/recycle'),

  restore: (id: number) => put<{ id: number; parentId: number }>(`/admin/recycle/${id}/restore`),

  purge: (id: number) => del<void>(`/admin/recycle/${id}`),

  // ---- 导出 / 导入 ----
  exportAll: () => get<ExportPayload>('/admin/export'),

  importAll: (payload: ExportPayload) => post<ImportStats>('/admin/import', payload),

  // ---- 版本历史 ----
  listVersions: (docId: number) => get<VersionItem[]>(`/admin/nodes/${docId}/versions`),

  getVersion: (docId: number, versionId: number) =>
    get<{ id: number; docId: number; name: string | null; content: string }>(
      `/admin/nodes/${docId}/versions/${versionId}`,
    ),

  rollback: (docId: number, versionId: number) =>
    put<void>(`/admin/nodes/${docId}/versions/${versionId}/rollback`, { versionId }),

  // ---- 上传 ----
  /** 上传 .md 文件（多文件），返回 [{fileName, id, finalName}] */
  uploadFiles: (files: File[], parentId: number) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    form.append('parentId', String(parentId));
    return post<{ fileName: string; id: number; finalName: string }[]>(
      '/admin/upload/file',
      form,
    );
  },

  /** 粘贴文本入库 */
  uploadText: (title: string, content: string, parentId: number) =>
    post<{ id: number; finalName: string }>('/admin/upload/text', { title, content, parentId }),
};
