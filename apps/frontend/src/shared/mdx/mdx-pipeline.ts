import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeHighlight from 'rehype-highlight';
import { parseFrontmatter, stringifyFrontmatter, type DocumentFrontmatter } from '@/modules/document/services/mdx-frontmatter';

export interface Heading {
  id: string;
  title: string;
  level: number;
  anchor: string;
}

export interface MdxCompileOptions {
  development?: boolean;
}

export type MdxComponent = React.ComponentType<Record<string, unknown>>;

export interface MdxCompileResult {
  code: string;
  headings: Heading[];
  frontmatter: DocumentFrontmatter;
  body: string;
  Component: MdxComponent;
}

function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .slice(0, 48);
}

export function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const headings: Heading[] = [];

  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();
      const anchor = toSlug(title) || 'section';
      headings.push({ id: anchor, title, level, anchor });
    }
  }

  return headings;
}

/**
 * 用 @mdx-js/mdx 的 compile + run 在浏览器内动态编译 MDX。
 *
 * 关键点:
 * 1. `outputFormat: 'function-body'` 让 compile 不再产出 ESM (有 import),
 *    而是产出可以直接 eval 的纯函数体
 * 2. `run()` 把函数体在提供的 runtime (react/jsx-runtime) 里执行,
 *    返回 { default: Component, ...exports } (无 import 解析问题)
 * 3. `baseUrl` 让 MDX 中的相对 import 仍能解析 (Vite dev server 会拦截)
 *
 * 工具链覆盖 (Phase 1 升级):
 *  - remark-gfm: GitHub Flavored Markdown (表格、表格对齐、任务列表、删除线、脚注、表格分割线 ---)
 *  - rehype-slug: 给 h1-h6 自动加 id
 *  - rehype-autolink-headings: 标题外层包裹锚点
 *  - rehype-external-links: 外链自动 target=_blank rel=noopener
 *  - rehype-highlight: 代码块语法高亮
 */
export async function compileMdx(
  source: string,
  options?: MdxCompileOptions,
): Promise<MdxCompileResult> {
  const { data: frontmatter, body } = parseFrontmatter(source);
  const headings = extractHeadings(body);

  const code = String(
    await compile(body, {
      outputFormat: 'function-body',
      development: false,
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
        rehypeHighlight,
      ],
    }),
  );

  // run() 在 react/jsx-runtime 沙箱里执行编译产物
  const mod = await run(code, {
    ...(runtime as any),
    baseUrl: import.meta.url,
  });
  const Component = mod.default as MdxComponent;

  return { code, headings, frontmatter, body, Component };
}

export function validateMdx(source: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const { body } = parseFrontmatter(source);

    const openBraces = (body.match(/\{/g) || []).length;
    const closeBraces = (body.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`JSX brace mismatch: ${openBraces} '{' vs ${closeBraces} '}'`);
    }

    const openTags = (body.match(/<[A-Z]/g) || []).length;
    const closeTags = (body.match(/\/>/g) || []).length + (body.match(/<\/[A-Z][^>]*>/g) || []).length;
    if (openTags > closeTags) {
      errors.push('Unclosed JSX tags detected');
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Unknown parse error');
  }

  return { valid: errors.length === 0, errors };
}

export function stripFrontmatter(source: string): string {
  const { body } = parseFrontmatter(source);
  return body;
}

export function buildFrontmatter(
  body: string,
  frontmatter: Partial<DocumentFrontmatter>,
): string {
  return stringifyFrontmatter(body, frontmatter);
}
