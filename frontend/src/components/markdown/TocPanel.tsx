import { useEffect, useState } from 'react';
import type { TocItem } from '../../utils/toc';
import type { HeadingRegistry } from './MarkdownViewer';
import './TocPanel.css';

/** 当前高亮判定线：距滚动容器顶部的偏移（略低于顶部，避免标题刚露头就切换） */
const ACTIVE_OFFSET = 80;

/**
 * 正文右侧悬浮大纲（PRD 3.5 TOC，P1）：
 * - 滚动高亮：IntersectionObserver 观察标题穿越判定线，取判定线以上最后一个标题
 * - 点击跳转：scrollIntoView 到登记表中的标题元素（不改 URL hash，避免触发路由）
 */
export function TocPanel({
  items,
  registry,
  scroller,
}: {
  items: TocItem[];
  registry: HeadingRegistry;
  scroller: HTMLElement | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (!scroller || items.length === 0) return;
    // 取判定线以上的最后一个标题
    const update = () => {
      const line = scroller.getBoundingClientRect().top + ACTIVE_OFFSET;
      let current = items[0].id;
      for (const it of items) {
        const el = registry.current.get(it.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = it.id;
        else break;
      }
      setActiveId(current);
    };
    // IntersectionObserver：仅在标题穿过判定线时回调，替代高频 scroll 监听
    const io = new IntersectionObserver(update, {
      root: scroller,
      rootMargin: `-${ACTIVE_OFFSET}px 0px 0px 0px`,
      threshold: 0,
    });
    items.forEach((it) => {
      const el = registry.current.get(it.id);
      if (el) io.observe(el);
    });
    update();
    return () => io.disconnect();
  }, [items, registry, scroller]);

  if (items.length < 2) return null;

  return (
    <nav className="toc-panel" aria-label="文档大纲">
      <div className="toc-title">目录</div>
      <ul>
        {items.map((it) => (
          <li key={it.id} className={`toc-l${it.level}${it.id === activeId ? ' active' : ''}`}>
            <button
              title={it.text}
              onClick={() => {
                registry.current.get(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveId(it.id);
              }}
            >
              {it.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
