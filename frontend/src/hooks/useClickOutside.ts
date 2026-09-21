import { useEffect, RefObject } from 'react';

/**
 * 点击外部关闭：监听 document click，目标不在 ref 容器内时触发回调。
 * 封装 SearchBox 等自定义下拉的「点外关闭」逻辑（frontend-style-priority L1：监听统一收进 hook）。
 */
export function useClickOutside(ref: RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [ref, onOutside]);
}
