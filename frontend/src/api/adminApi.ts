import { del, get, post, put } from './http';
import type { AuthTokens, TreeNode } from '../types/api';

// 后台管理接口（JWT 鉴权）
export const adminApi = {
  // ---- 认证 ----
  login: (username: string, password: string) =>
    post<AuthTokens>('/admin/auth/login', { username, password }),

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

  move: (id: number, targetParentId: number, sortOrder: number) =>
    put<void>(`/admin/nodes/${id}/move`, { targetParentId, sortOrder }),

  remove: (id: number) => del<void>(`/admin/nodes/${id}`),

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
