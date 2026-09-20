import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ViewerPrefs {
  theme: Theme;
  sidebarCollapsed: boolean;
  /** 每篇文档的滚动位置记忆：docId -> scrollTop */
  scrollPositions: Record<number, number>;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  setScroll: (docId: number, top: number) => void;
}

// 前台阅读偏好：主题 / 折叠态 / 滚动记忆（技术设计文档 2.4/2.5）
export const useViewerPrefs = create<ViewerPrefs>()(
  persist(
    (set, get) => ({
      theme: 'system',
      sidebarCollapsed: false,
      scrollPositions: {},
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setScroll: (docId, top) =>
        set({ scrollPositions: { ...get().scrollPositions, [docId]: top } }),
    }),
    { name: 'mdv-prefs' },
  ),
);
