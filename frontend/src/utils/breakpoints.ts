// 响应式断点常量（技术设计文档 2.6.1）：<768 移动 / 768-1279 平板 / >=1280 桌面
export const BREAKPOINTS = { mobile: 768, desktop: 1280 } as const;

export const isMobileQuery = `(max-width: ${BREAKPOINTS.mobile - 1}px)`;
export const isDesktopQuery = `(min-width: ${BREAKPOINTS.desktop}px)`;
