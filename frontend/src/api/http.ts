import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { Result } from '../types/api';

// 统一 axios 实例：cookie 会话由浏览器自动携带（2026-09-21 去 Authorization 注入）
export const http = axios.create({ baseURL: '/api', timeout: 15000, withCredentials: true });

http.interceptors.response.use(
  (resp) => {
    const body = resp.data as Result<unknown>;
    if (body.code !== 0) {
      return Promise.reject(new ApiError(body.code, body.msg));
    }
    return resp;
  },
  (err) => {
    // 401：清除登录态（路由守卫会重定向登录页）
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    const body = err.response?.data as Result<unknown> | undefined;
    return Promise.reject(
      new ApiError(body?.code ?? -1, body?.msg ?? err.message ?? '网络错误'),
    );
  },
);

export class ApiError extends Error {
  constructor(public code: number, msg: string) {
    super(msg);
  }
}

// 便捷方法：直接取 data
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const resp = await http.get<Result<T>>(url, { params });
  return resp.data.data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const resp = await http.post<Result<T>>(url, body);
  return resp.data.data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const resp = await http.put<Result<T>>(url, body);
  return resp.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const resp = await http.delete<Result<T>>(url);
  return resp.data.data;
}
