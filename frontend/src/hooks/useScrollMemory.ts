import { useEffect } from 'react';
import { useViewerPrefs } from '../stores/viewerPrefsStore';

/** 各文档滚动位置记忆：切换时还原、滚动时保存（技术设计文档 2.5） */
export function useScrollMemory(docId: number | null, getScroller: () => HTMLElement | null) {
  const setScroll = useViewerPrefs((s) => s.setScroll);
  const scrollPositions = useViewerPrefs((s) => s.scrollPositions);

  // docId 变化时还原
  useEffect(() => {
    const el = getScroller();
    if (el && docId != null) el.scrollTop = scrollPositions[docId] ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // 滚动保存
  useEffect(() => {
    const el = getScroller();
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (docId != null) setScroll(docId, el.scrollTop);
      }, 200);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, setScroll]);
}
