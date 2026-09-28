import { useEffect, useRef } from 'react';
import { portalApi } from '../api/portalApi';
import { useDocTreeStore } from '../stores/docTreeStore';

/**
 * 前台版本同步（M2：SSE 推送优先，轮询兜底，技术设计文档 3.4.4 升级）：
 * - 首选 EventSource 订阅 /portal/events，服务端 bump 即时推送，变更刷新树
 * - SSE 不可用（旧后端/代理拦截）或连接连续失败时自动降级为 10s 轮询
 * - EventSource 断线由浏览器自动重连；重连成功推的版本与本地不同即刷新
 */
export function usePolling(onChange: () => void, intervalMs = 10_000) {
  const lastVersion = useRef<number | null>(null);
  // 用 ref 保持回调最新，避免闭包过期
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    let stopped = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let sseFailed = false;

    // 版本变化处理：与本地基线不同则刷新树并触发回调
    const handleVersion = async (version: number) => {
      if (stopped) return;
      if (lastVersion.current !== null && lastVersion.current !== version) {
        await useDocTreeStore.getState().load();
        cbRef.current();
      }
      lastVersion.current = version;
    };

    // ---- 轮询模式（兜底） ----
    const startPolling = () => {
      if (pollTimer != null || stopped) return;
      const poll = async () => {
        try {
          const { version } = await portalApi.getVersion();
          await handleVersion(version);
        } catch {
          // 网络抖动忽略，下轮重试
        }
      };
      void poll();
      pollTimer = setInterval(poll, intervalMs);
    };

    // ---- SSE 模式（首选） ----
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/portal/events');
    } catch {
      sseFailed = true;
    }

    if (es) {
      let received = false;
      es.addEventListener('data', (ev) => {
        try {
          const payload = JSON.parse((ev as MessageEvent).data) as { version: number };
          received = true;
          void handleVersion(payload.version);
        } catch {
          // 非法载荷忽略
        }
      });
      // 连接建立 5s 内没收到首推（事件名 data 的首条）视为不可用，降级轮询
      const degrade = setTimeout(() => {
        if (!received && !stopped) {
          sseFailed = true;
          es?.close();
          startPolling();
        }
      }, 5_000);
      es.onerror = () => {
        // EventSource 会自动重连；仅当降级标志已置时才彻底关
        if (sseFailed) es?.close();
      };
      // 清理降级定时器防泄漏
      es.addEventListener('data', () => clearTimeout(degrade), { once: true });
    }

    if (sseFailed) startPolling();

    return () => {
      stopped = true;
      es?.close();
      if (pollTimer != null) clearInterval(pollTimer);
    };
  }, [intervalMs]);
}
