import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ViewerPrefs {
  theme: Theme;
  /** 每篇文档的滚动位置记忆：docId -> scrollTop */
  scrollPositions: Record<number, number>;
  setTheme: (t: Theme) => void;
  setScroll: (docId: number, top: number) => void;
}

// 前台阅读偏好：主题 / 滚动记忆（技术设计文档 2.4/2.5）
// 侧栏折叠态不持久化：曾因 persist 恢复 collapsed=true 导致侧栏锁死 0px（已踩坑）
export const useViewerPrefs = create<ViewerPrefs>()(
  persist(
    (set, get) => ({
      theme: 'system',
      scrollPositions: {},
      setTheme: (theme) => set({ theme }),
      setScroll: (docId, top) =>
        set({ scrollPositions: { ...get().scrollPositions, [docId]: top } }),
    }),
    {
      name: 'mdv-prefs',
      partialize: (s) => ({ theme: s.theme, scrollPositions: s.scrollPositions }),
    },
  ),
);
