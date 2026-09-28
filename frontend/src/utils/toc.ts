// TOC 抽取：从 Markdown 源码提取 h2/h3 标题。
// 锚点 id 用源码行号（h-L{line}）——渲染侧从 AST position 取同一行号，保证两边一致且天然去重。
export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export const headingId = (line: number) => `h-L${line}`;

// 去掉标题里的常见行内 Markdown 标记，只留可读文本
function plainText(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim();
}

export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  let fence: string | null = null;
  markdown.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    // 代码块内的 # 不是标题：跟踪 ``` / ~~~ 围栏
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      return;
    }
    if (fence !== null) return;
    const m = /^(#{2,3})\s+(.+?)\s*#*$/.exec(line);
    if (m) {
      items.push({ id: headingId(i + 1), text: plainText(m[2]), level: m[1].length as 2 | 3 });
    }
  });
  return items;
}
