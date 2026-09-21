import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MarkdownViewer } from '../../components/markdown/MarkdownViewer';
import { portalApi } from '../../api/portalApi';
import { useDocTreeStore } from '../../stores/docTreeStore';
import { useScrollMemory } from '../../hooks/useScrollMemory';
import { useScroller } from '../../contexts/ScrollerContext';
import type { DocContent } from '../../types/api';
import './DocView.css';

type ViewMode = 'preview' | 'source';

// 文档回显页：面包屑 + 预览/源码切换 + 渲染正文（PRD 3.5）
export default function DocView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const docId = Number(id);

  const [doc, setDoc] = useState<DocContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('preview');

  const select = useDocTreeStore((s) => s.select);
  const nodesVersion = useDocTreeStore((s) => s.nodes); // 轮询刷新树后触发重载（文档被删/更新）
  const contentRef = useRef<HTMLDivElement>(null);

  const loadDoc = useCallback(async () => {
    if (!Number.isFinite(docId)) return;
    try {
      setError(null);
      setDoc(await portalApi.getDocContent(docId));
    } catch (e) {
      setDoc(null);
      setError(e instanceof Error ? e.message : '文档加载失败');
    }
  }, [docId]);

  useEffect(() => {
    select(Number.isFinite(docId) ? docId : null);
    void loadDoc();
  }, [docId, loadDoc, select]);

  // 树数据变化（轮询同步）且包含当前文档时重载正文
  useEffect(() => {
    if (nodesVersion.length && doc && nodesVersion.some((n) => n.id === docId)) {
      void loadDoc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesVersion]);

  const scrollerRef = useScroller();
  useScrollMemory(
    Number.isFinite(docId) ? docId : null,
    () => scrollerRef?.current ?? null,
  );

  useEffect(() => {
    if (error) {
      // 文档不存在（可能已被删除）：回到首页
      const timer = setTimeout(() => navigate('/', { replace: true }), 1200);
      return () => clearTimeout(timer);
    }
  }, [error, navigate]);

  return (
    <div ref={contentRef}>
      {error && <div className="doc-error">⚠️ {error}，即将返回首页…</div>}
      {!error && !doc && <div className="doc-loading">加载中…</div>}
      {doc && (
        <>
          <div className="doc-header">
            <nav className="breadcrumb" aria-label="路径">
              {doc.breadcrumb.map((b, i) => (
                <span key={b.id}>
                  {i > 0 && <span className="crumb-sep">/</span>}
                  <span className={i === doc.breadcrumb.length - 1 ? 'crumb-cur' : ''}>
                    {b.name}
                  </span>
                </span>
              ))}
            </nav>
            <div className="doc-meta">
              <span>更新于 {new Date(doc.updatedAt).toLocaleString('zh-CN')}</span>
              <span className="view-switch">
                <button
                  className={mode === 'preview' ? 'active' : ''}
                  onClick={() => setMode('preview')}
                >
                  预览
                </button>
                <button
                  className={mode === 'source' ? 'active' : ''}
                  onClick={() => setMode('source')}
                >
                  源码
                </button>
              </span>
            </div>
          </div>
          {mode === 'preview' ? (
            <MarkdownViewer content={doc.content} />
          ) : (
            <pre className="doc-source">{doc.content}</pre>
          )}
        </>
      )}
    </div>
  );
}
