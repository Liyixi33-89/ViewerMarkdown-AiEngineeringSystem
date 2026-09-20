import { useCallback, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './CodeBlock.css';

// 代码块：语法高亮 + 一键复制（技术设计文档 2.3）
export function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  // react-markdown 传 className 形如 language-ts
  const match = /language-(\w+)/.exec(className ?? '');
  const code = String(children ?? '').replace(/\n$/, '');

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板权限受限时忽略
    }
  }, [code]);

  if (!match) {
    return <code className="inline-code">{children}</code>;
  }

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{match[1]}</span>
        <button className="code-copy" onClick={onCopy}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: 13 }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
