// 首页：重定向到上次浏览/第一篇文档；无文档时空态引导
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDocTreeStore } from '../../stores/docTreeStore';

export default function Home() {
  const navigate = useNavigate();
  const tree = useDocTreeStore((s) => s.tree);
  const loaded = useDocTreeStore((s) => s.loaded);
  const selectedId = useDocTreeStore((s) => s.selectedId);

  useEffect(() => {
    if (!loaded || tree.length === 0) return;
    if (selectedId != null) {
      navigate(`/doc/${selectedId}`, { replace: true });
    } else {
      // 深度优先找第一篇文档
      const firstDoc = (nodes: typeof tree): number | null => {
        for (const n of nodes) {
          if (n.type === 'DOC') return n.id;
          const sub = firstDoc(n.children);
          if (sub != null) return sub;
        }
        return null;
      };
      const id = firstDoc(tree);
      if (id != null) navigate(`/doc/${id}`, { replace: true });
    }
  }, [loaded, tree, selectedId, navigate]);

  if (loaded && tree.length === 0) {
    return (
      <div className="home-empty">
        <h2>暂无文档</h2>
        <p>请管理员登录 <a href="/admin">后台管理</a> 上传 Markdown 文档</p>
      </div>
    );
  }

  if (loaded && tree.length > 0) return <Navigate to="/" replace />;
  return <div className="home-empty">加载中…</div>;
}
