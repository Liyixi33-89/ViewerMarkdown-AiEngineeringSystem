import { useEffect, useRef } from 'react';
import { portalApi } from '../api/portalApi';
import { useDocTreeStore } from '../stores/docTreeStore';

/**
 * 前台版本轮询同步（M1 方案，技术设计文档 4.7/3.4.4）：
 * 每 10s 比对 /portal/version 时间戳，变化则刷新树并触发回调（刷新当前文档）。
 */
export function usePolling(onChange: () => void, intervalMs = 10_000) {
  const lastVersion = useRef<number | null>(null);
  // 用 ref 保持回调最新，避免闭包过期
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        const { version } = await portalApi.getVersion();
        if (stopped) return;
        if (lastVersion.current !== null && lastVersion.current !== version) {
          await useDocTreeStore.getState().load();
          cbRef.current();
        }
        lastVersion.current = version;
      } catch {
        // 网络抖动忽略，下轮重试
      }
    };

    void poll();
    const timer = setInterval(poll, intervalMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [intervalMs]);
}
