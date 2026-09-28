import { useMemo, type ComponentPropsWithoutRef, type MutableRefObject } from 'react';
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { CodeBlock } from './CodeBlock';
import { headingId } from '../../utils/toc';
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

/** 标题元素登记表：id → DOM 元素（供 TOC 滚动高亮与跳转，避免 querySelector） */
export type HeadingRegistry = MutableRefObject<Map<string, HTMLElement>>;

type HeadingProps = ComponentPropsWithoutRef<'h2'> & ExtraProps;

/**
 * 统一 Markdown 渲染管线（前台与后台预览复用，技术设计文档 2.3）。
 * 安全约定：所有渲染必须经过本组件（rehype-sanitize 白名单消毒），
 * 禁止绕过消毒直接 dangerouslySetInnerHTML。
 * h2/h3 的 id 取源码行号（与 utils/toc 抽取规则一致），在消毒之后由组件注入，不受 clobber 前缀影响。
 */
export function MarkdownViewer({
  content,
  headingRegistry,
}: {
  content: string;
  headingRegistry?: HeadingRegistry;
}) {
  // 组件映射必须稳定：每次渲染新建函数组件会导致标题整体重挂载
  const components = useMemo<Components>(() => {
    const renderHeading = (Tag: 'h2' | 'h3') =>
      function Heading({ node, children, ...rest }: HeadingProps) {
        const line = node?.position?.start.line;
        const id = line ? headingId(line) : undefined;
        return (
          <Tag
            {...rest}
            id={id}
            ref={(el: HTMLHeadingElement | null) => {
              if (!id || !headingRegistry) return;
              if (el) headingRegistry.current.set(id, el);
              else headingRegistry.current.delete(id);
            }}
          >
            {children}
          </Tag>
        );
      };
    return {
      code: CodeBlock,
      h2: renderHeading('h2'),
      h3: renderHeading('h3'),
      img: ({ src, alt }) => <img src={src} alt={alt ?? ''} loading="lazy" className="md-img" />,
    };
  }, [headingRegistry]);

  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
