'use client';

import React, { createContext, useContext } from 'react';
import { MDXProvider as BaseMDXProvider } from '@mdx-js/react';
import type { MDXComponents as MDXComponentsType } from 'mdx/types';
import { MdxHeading } from './components/mdx-heading';
import { MdxCodeBlock } from './components/mdx-code-block';
import { MdxTable, MdxTableHead, MdxTableBody, MdxTableRow, MdxTableHeader, MdxTableCell } from './components/mdx-table';
import { MdxBlockquote } from './components/mdx-blockquote';

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type ListProps = React.HTMLAttributes<HTMLUListElement>;
type ListItemProps = React.HTMLAttributes<HTMLLIElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;
type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement>;
type ImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const defaultComponents: MDXComponentsType = {
  h1: (props: HeadingProps) => <MdxHeading level={1} {...props} />,
  h2: (props: HeadingProps) => <MdxHeading level={2} {...props} />,
  h3: (props: HeadingProps) => <MdxHeading level={3} {...props} />,
  h4: (props: HeadingProps) => <MdxHeading level={4} {...props} />,
  h5: (props: HeadingProps) => <MdxHeading level={5} {...props} />,
  h6: (props: HeadingProps) => <MdxHeading level={6} {...props} />,
  pre: MdxCodeBlock as unknown as MDXComponentsType['pre'],
  blockquote: MdxBlockquote as unknown as MDXComponentsType['blockquote'],
  table: MdxTable as unknown as MDXComponentsType['table'],
  thead: MdxTableHead as unknown as MDXComponentsType['thead'],
  tbody: MdxTableBody as unknown as MDXComponentsType['tbody'],
  tr: MdxTableRow as unknown as MDXComponentsType['tr'],
  th: MdxTableHeader as unknown as MDXComponentsType['th'],
  td: MdxTableCell as unknown as MDXComponentsType['td'],
  ul: (props: ListProps) => <ul className="list-disc space-y-1 pl-5 my-4" {...props} />,
  ol: (props: ListProps) => <ol className="list-decimal space-y-1 pl-5 my-4" {...props} />,
  li: (props: ListItemProps) => <li className="text-base leading-relaxed" {...props} />,
  p: (props: ParagraphProps) => <p className="mb-4 text-base leading-relaxed" {...props} />,
  a: (props: AnchorProps) => (
    <a
      className="text-accent-blue underline underline-offset-2 hover:text-accent-blue/80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
  img: (props: ImageProps) => (
    <img className="rounded-lg max-w-full my-4" loading="lazy" {...props} />
  ),
};

export interface MdxProviderProps {
  children: React.ReactNode;
  components?: MDXComponentsType;
  scope?: Record<string, unknown>;
}

const defaultComponentsRef: { current: MDXComponentsType } = { current: defaultComponents };

export function MdxProvider({ children, components = {}, scope }: MdxProviderProps) {
  const mergedComponents = React.useMemo<MDXComponentsType>(
    () => ({ ...defaultComponentsRef.current, ...components }),
    [components],
  );
  const contextValue = React.useMemo(
    () => ({ components: mergedComponents, scope }),
    [mergedComponents, scope],
  );

  return (
    <MDXContext.Provider value={contextValue}>
      <BaseMDXProvider components={mergedComponents}>
        <div className="mdx-content">{children}</div>
      </BaseMDXProvider>
    </MDXContext.Provider>
  );
}

export const MDXContext = createContext<{
  components: MDXComponentsType;
  scope?: Record<string, unknown>;
}>({ components: defaultComponents });

export function useMDXComponents(): MDXComponentsType {
  const ctx = useContext(MDXContext);
  return ctx.components;
}

export function useMDXScope(): Record<string, unknown> | undefined {
  const ctx = useContext(MDXContext);
  return ctx.scope;
}
