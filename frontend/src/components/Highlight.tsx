// 关键词高亮：按关键词（忽略大小写）切分文本，命中段落用 <mark> 包裹；纯文本渲染，无 XSS 风险
export function Highlight({ text, keyword }: { text: string; keyword: string }) {
  const kw = keyword.trim();
  if (!kw) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerKw = kw.toLowerCase();
  const parts: { s: string; hit: boolean }[] = [];
  let from = 0;
  let idx = lowerText.indexOf(lowerKw, from);
  while (idx >= 0) {
    if (idx > from) parts.push({ s: text.slice(from, idx), hit: false });
    parts.push({ s: text.slice(idx, idx + kw.length), hit: true });
    from = idx + kw.length;
    idx = lowerText.indexOf(lowerKw, from);
  }
  if (from < text.length) parts.push({ s: text.slice(from), hit: false });
  return (
    <>
      {parts.map((p, i) => (p.hit ? <mark key={i} className="hl">{p.s}</mark> : <span key={i}>{p.s}</span>))}
    </>
  );
}
