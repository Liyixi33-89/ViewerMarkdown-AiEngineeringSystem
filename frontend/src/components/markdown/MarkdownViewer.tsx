import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CodeBlock } from './CodeBlock';
import './MarkdownViewer.css';

// 白名单扩展：允许 code 的 className（语言标记）；默认 schema 已禁 script/iframe/事件属性
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
  },
};

/**
 * 统一 Markdown 渲染管线（前台与后台预览复用，技术设计文档 2.3）。
 * 安全约定：所有渲染必须经过本组件（rehype-sanitize 白名单消毒），
 * 禁止绕过消毒直接 dangerouslySetInnerHTML。
 */
export function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          code: CodeBlock,
          img: ({ src, alt }) => (
            <img src={src} alt={alt ?? ''} loading="lazy" className="md-img" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
