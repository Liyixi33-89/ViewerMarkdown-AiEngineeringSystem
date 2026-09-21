import { createContext, useContext } from 'react';

/**
 * 内容区滚动容器 Context：PortalLayout 持有 main 元素 ref，
 * DocView 通过 context 取元素做滚动记忆，替代跨组件 getElementById（frontend-style-priority L1）。
 */
export const ScrollerContext = createContext<React.RefObject<HTMLElement> | null>(null);

export function useScroller(): React.RefObject<HTMLElement> | null {
  return useContext(ScrollerContext);
}
