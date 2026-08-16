'use client';

import React, { createContext, useContext } from 'react';
import { MDXProvider as BaseMDXProvider } from '@mdx-js/react';
import type { MDXComponents as MDXComponentsType } from 'mdx/types';
import { MdxHeading } from './components/mdx-heading';
import { MdxCodeBlock } from './components/mdx-code-block';
import { MdxCallout } from './components/mdx-callout';
import { MdxTable, MdxTableHead, MdxTableBody, MdxTableRow, MdxTableHeader, MdxTableCell } from './components/mdx-table';
import { MdxBlockquote } from './components/mdx-blockquote';

const defaultComponents: MDXComponentsType = {
  h1: (props: any) => <MdxHeading level={1} {...props} />,
  h2: (props: any) => <MdxHeading level={2} {...props} />,
  h3: (props: any) => <MdxHeading level={3} {...props} />,
  h4: (props: any) => <MdxHeading level={4} {...props} />,
  h5: (props: any) => <MdxHeading level={5} {...props} />,
  h6: (props: any) => <MdxHeading level={6} {...props} />,
  pre: MdxCodeBlock as any,
  blockquote: MdxBlockquote as any,
  table: MdxTable as any,
  thead: MdxTableHead as any,
  tbody: MdxTableBody as any,
  tr: MdxTableRow as any,
  th: MdxTableHeader as any,
  td: MdxTableCell as any,
  ul: (props: any) => <ul className="list-disc space-y-1 pl-5 my-4" {...props} />,
  ol: (props: any) => <ol className="list-decimal space-y-1 pl-5 my-4" {...props} />,
  li: (props: any) => <li className="text-base leading-relaxed" {...props} />,
  p: (props: any) => <p className="mb-4 text-base leading-relaxed" {...props} />,
  a: (props: any) => (
    <a
      className="text-accent-blue underline underline-offset-2 hover:text-accent-blue/80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  hr: () => <hr className="my-8 border-border" />,
  img: (props: any) => (
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
