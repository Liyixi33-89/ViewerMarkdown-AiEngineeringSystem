import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { DocTree } from '../components/DocTree/DocTree';
import { SearchBox } from '../components/SearchBox';
import { useDocTreeStore } from '../stores/docTreeStore';
import { useViewerPrefs } from '../stores/viewerPrefsStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePolling } from '../hooks/usePolling';
import { isMobileQuery } from '../utils/breakpoints';
import { ScrollerContext } from '../contexts/ScrollerContext';
import './PortalLayout.css';

// 前台门户壳：顶栏 + 只读树 + 内容区；桌面三栏 / 移动全屏抽屉
export default function PortalLayout() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(isMobileQuery);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  const { load, select, selectedId } = useDocTreeStore();
  const theme = useViewerPrefs((s) => s.theme);
  const setTheme = useViewerPrefs((s) => s.setTheme);
  // 折叠态为本地 UI 状态：刷新后默认展开，不写入 localStorage
  const [collapsed, setCollapsed] = useState(false);

  // 主题应用到根节点（system 跟随系统）
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    document.documentElement.dataset.theme = effective;
  }, [theme]);

  // 首次加载树：无条件执行（幂等）。不依赖 loaded 标志——
  // persist 恢复的过期 loaded=true 会导致跳过加载、树空白（已踩坑）
  useEffect(() => {
    void load();
  }, [load]);

  // 版本轮询：变更时刷新树；当前文档由 DocView 自行监听 nodes 变化重载
  usePolling(() => undefined);

  const onSelect = (id: number) => {
    select(id);
    setDrawerOpen(false);
    navigate(`/doc/${id}`);
  };

  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  return (
    <div className="portal">
      <header className="portal-topbar">
        {isMobile && (
          <button className="icon-btn" aria-label="打开目录" onClick={() => setDrawerOpen(true)}>
            ☰
          </button>
        )}
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          📄 MD Viewer
        </a>
        {!isMobile && (
          <SearchBox
            onSelect={(id) => {
              select(id);
              navigate(`/doc/${id}`);
            }}
          />
        )}
        <div className="spacer" />
        {isMobile && (
          <button
            className="icon-btn"
            aria-label="搜索"
            onClick={() => {
              const kw = window.prompt('搜索文档');
              if (kw) void kw;
            }}
          >
            🔍
          </button>
        )}
        <button
          className="icon-btn"
          aria-label="切换主题"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? '🌙' : '☀️'}
        </button>
        <a className="icon-btn" aria-label="后台管理" href="/admin" title="后台管理">
          ⚙️
        </a>
      </header>

      <div className={`portal-main${!isMobile && collapsed ? ' collapsed' : ''}`}>
        <aside
          className={`portal-sidebar${isMobile && drawerOpen ? ' open' : ''}`}
        >
          <div className="sidebar-toolbar">
            <span>目录</span>
            {!isMobile && (
              <button
                className="icon-btn"
                style={{ marginLeft: 'auto', width: 28, height: 28 }}
                aria-label="折叠侧栏"
                onClick={() => setCollapsed(true)}
              >
                «
              </button>
            )}
          </div>
          <DocTree readonly onSelect={onSelect} selectedId={selectedId} />
        </aside>
        {isMobile && drawerOpen && (
          <div className="sidebar-backdrop" onClick={() => setDrawerOpen(false)} />
        )}
        {/* 折叠态逃生按钮：侧栏宽 0 后内部按钮不可见，必须在内容区提供展开入口 */}
        {!isMobile && collapsed && (
          <button
            className="icon-btn sidebar-expand-fab"
            aria-label="展开侧栏"
            title="展开目录"
            onClick={() => setCollapsed(false)}
          >
            »
          </button>
        )}
        <main className="portal-content" ref={contentRef}>
          <ScrollerContext.Provider value={contentRef}>
            <Outlet />
          </ScrollerContext.Provider>
        </main>
      </div>
    </div>
  );
}
