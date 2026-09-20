// 与后端统一响应结构对应（技术设计文档 3.3 节）
export interface Result<T> {
  code: number;
  msg: string;
  data: T;
}

export interface TreeNode {
  id: number;
  parentId: number;
  name: string;
  type: 'FOLDER' | 'DOC';
  sortOrder: number;
  status?: 'PUBLISHED' | 'DRAFT';
  hasChildren?: boolean;
}

export interface DocContent {
  id: number;
  name: string;
  content: string;
  updatedAt: string;
  breadcrumb: { id: number; name: string }[];
}

export interface SearchHit {
  id: number;
  name: string;
  path: string;
  snippet?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: number; username: string; role: string };
}
