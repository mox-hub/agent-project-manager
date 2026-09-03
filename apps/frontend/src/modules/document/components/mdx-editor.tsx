'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit, syntaxHighlighting, defaultHighlightStyle, HighlightStyle } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { tags as t } from '@lezer/highlight';
import { cn } from '@/lib/utils';

export interface MdxEditorRef {
  insertText: (text: string, options?: { surroundWith?: string; placeholder?: string }) => void;
  wrapSelection: (left: string, right?: string) => void;
  focus: () => void;
}

export interface MdxEditorProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
}

const mdxHighlight = HighlightStyle.define([
  { tag: t.heading1, class: 'cm-heading cm-heading-1' },
  { tag: t.heading2, class: 'cm-heading cm-heading-2' },
  { tag: t.heading3, class: 'cm-heading cm-heading-3' },
  { tag: t.heading4, class: 'cm-heading cm-heading-4' },
  { tag: t.heading5, class: 'cm-heading cm-heading-5' },
  { tag: t.heading6, class: 'cm-heading cm-heading-6' },
  { tag: t.strong, class: 'cm-strong', fontWeight: 'bold' },
  { tag: t.emphasis, class: 'cm-emphasis', fontStyle: 'italic' },
  { tag: t.link, class: 'cm-link', textDecoration: 'underline' },
  { tag: t.url, class: 'cm-url' },
  { tag: t.monospace, class: 'cm-monospace', fontFamily: 'monospace' },
  { tag: t.quote, class: 'cm-quote', fontStyle: 'italic', color: 'var(--muted-foreground)' },
  { tag: t.list, class: 'cm-list' },
  { tag: t.meta, class: 'cm-meta' },
  { tag: t.processingInstruction, class: 'cm-meta' },
  { tag: t.contentSeparator, class: 'cm-separator', color: 'var(--muted-foreground)' },
]);

const customTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      color: 'var(--foreground)',
      fontSize: '13px',
    },
    '.cm-scroller': {
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
      lineHeight: '1.6',
    },
    '.cm-content': {
      padding: '12px 16px',
      caretColor: 'var(--foreground)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      borderRight: '1px solid var(--border)',
      color: 'var(--muted-foreground)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--muted)',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--muted)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--accent) !important',
    },
    '.cm-foldPlaceholder': {
      backgroundColor: 'var(--muted)',
      border: '1px solid var(--border)',
      color: 'var(--muted-foreground)',
    },
  },
  { dark: false },
);

const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: 'var(--foreground)',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--muted-foreground)',
    },
  },
  { dark: true },
);

export const MdxEditor = forwardRef<MdxEditorRef, MdxEditorProps>(function MdxEditor(
  { value, onChange, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const valueRef = useRef<string>(value);
  const themeCompartment = useRef<Compartment>(new Compartment());

  useImperativeHandle(
    ref,
    () => ({
      insertText(text, options) {
        const view = viewRef.current;
        if (!view) return;
        const sel = view.state.selection.main;
        const surround = options?.surroundWith;
        const placeholder = options?.placeholder ?? text;
        let insert = text;
        if (sel.from !== sel.to && surround) {
          const selected = view.state.sliceDoc(sel.from, sel.to);
          insert = `${surround}${selected || placeholder}${surround}`;
        }
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert },
          selection: sel.from === sel.to ? { anchor: sel.from + insert.length } : { anchor: sel.from, head: sel.from + insert.length },
          scrollIntoView: true,
        });
        view.focus();
      },
      wrapSelection(left, right = left) {
        const view = viewRef.current;
        if (!view) return;
        const sel = view.state.selection.main;
        const selected = sel.from === sel.to ? '' : view.state.sliceDoc(sel.from, sel.to);
        const insert = `${left}${selected || ''}${right}`;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert },
          selection: sel.from === sel.to ? { anchor: sel.from + left.length } : { anchor: sel.from, head: sel.from + insert.length },
        });
        view.focus();
      },
      focus() {
        viewRef.current?.focus();
      },
    }),
    [],
  );

  // 初始化一次
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        syntaxHighlighting(mdxHighlight),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage, codeLanguages: () => null }),
        themeCompartment.current.of([customTheme, darkTheme]),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        indentUnit.of('  '),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            const next = u.state.doc.toString();
            valueRef.current = next;
            onChange(next);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 故意不把 onChange 列入依赖: 内部使用 ref 模式
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部 value 变化时同步到编辑器(只在视图未聚焦时)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (value === valueRef.current) return;
    if (view.hasFocus) return;
    valueRef.current = value;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={cn('h-full w-full overflow-hidden bg-background [&_.cm-editor]:h-full [&_.cm-editor]:outline-hidden', className)}
    />
  );
});
