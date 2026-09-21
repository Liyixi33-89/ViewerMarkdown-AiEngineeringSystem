import { useEffect, useRef, useState } from 'react';
import { portalApi } from '../api/portalApi';
import { debounce } from '../utils/debounce';
import { useClickOutside } from '../hooks/useClickOutside';
import type { SearchHit } from '../types/api';
import './SearchBox.css';

// 顶栏搜索：防抖 300ms 即时下拉（技术设计文档 2.5）
export function SearchBox({ onSelect }: { onSelect: (id: number) => void }) {
  const [keyword, setKeyword] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const doSearch = useRef(
    debounce(async (kw: string) => {
      if (!kw.trim()) {
        setHits([]);
        return;
      }
      try {
        const list = await portalApi.search(kw);
        setHits(list);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 300),
  ).current;

  useEffect(() => {
    doSearch(keyword);
  }, [keyword, doSearch]);

  // 点击外部关闭
  const closeDropdown = useRef(() => setOpen(false)).current;
  useClickOutside(boxRef, closeDropdown);

  return (
    <div className="search-box" ref={boxRef}>
      <input
        className="search-input"
        placeholder="搜索文档…"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && hits[0]) {
            onSelect(hits[0].id);
            setOpen(false);
          }
          if (e.key === 'Escape') {
            setKeyword('');
            setOpen(false);
          }
        }}
      />
      {open && (
        <div className="search-dropdown">
          {hits.length === 0 && keyword.trim() && <div className="search-empty">无匹配结果</div>}
          {hits.map((h) => (
            <button
              key={h.id}
              className="search-item"
              onClick={() => {
                onSelect(h.id);
                setOpen(false);
              }}
            >
              <span className="search-item-name">📄 {h.name}</span>
              <span className="search-item-path">{h.path}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
