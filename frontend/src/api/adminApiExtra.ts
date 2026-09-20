import { get } from './http';
import type { DocContent } from '../types/api';

// 管理端读取文档全量内容（含草稿；与 portal 接口区分）
export async function adminGetDoc(id: number): Promise<DocContent> {
  return get<DocContent>(`/admin/nodes/${id}/doc`);
}
