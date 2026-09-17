import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentPropertiesPanel } from './document-properties-panel';
import { parseFrontmatterProperties } from '../services/mdx-frontmatter';

/**
 * Obsidian 式属性面板：键值行渲染、chip 增删、行内编辑、属性新增、
 * 系统镜像键只读、畸形 YAML 降级。写回断言一律解析 onSave 载荷。
 */

// base-ui Checkbox 点击时用 ownerWindow.PointerEvent 派发事件，jsdom 没有
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    Object.defineProperty(window, 'PointerEvent', {
      configurable: true,
      value: class PointerEventFake extends MouseEvent {},
    });
  }
});

const SAMPLE = `---
title: 架构总览
status: draft
tags: [frontend, arch]
priority: 2
draft: true
---

# 正文标题

正文内容。`;

const setup = (overrides: Partial<{ content: string; editable: boolean }> = {}) => {
  const onSave = vi.fn();
    render(
      <DocumentPropertiesPanel
        content={overrides.content ?? SAMPLE}
        editable={overrides.editable ?? true}
        onSave={onSave}
      />,
    );
  return { onSave };
};

const payloadOf = (onSave: ReturnType<typeof vi.fn>, call = 0) => {
  const content = onSave.mock.calls[call]?.[0] as string;
  return parseFrontmatterProperties(content);
};

describe('DocumentPropertiesPanel', () => {
  it('renders all properties in YAML order with values', () => {
    setup();
    expect(screen.getByText('(5)')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('架构总览')).toBeInTheDocument();
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('arch')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // 正文不属于属性面板
    expect(screen.queryByText('# 正文标题')).not.toBeInTheDocument();
  });

  it('keeps system mirror keys readonly (no editor, no remove)', () => {
    setup();
    // title 的值渲染为纯文本（readonly 分支），没有可点击的编辑按钮
    expect(screen.getAllByTitle(/系统镜像属性/).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: '删除属性 title' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除属性 status' })).not.toBeInTheDocument();
  });

  it('removes a tag chip and writes the array back without touching body', async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.click(screen.getByRole('button', { name: '移除 frontend' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const r = payloadOf(onSave);
    expect(r.properties.find((p) => p.key === 'tags')?.value).toEqual(['arch']);
    expect(r.body).toContain('# 正文标题');
  });

  it('edits a text value inline on Enter', async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.click(screen.getByText('2'));
    const input = screen.getByPlaceholderText('属性值');
    await user.clear(input);
    await user.type(input, '5{Enter}');
    expect(onSave).toHaveBeenCalledTimes(1);
    // number 型属性回型：编辑不把 YAML 数字降级成字符串
    expect(payloadOf(onSave).properties.find((p) => p.key === 'priority')?.value).toBe(5);
  });

  it('toggles a boolean property via checkbox', async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.click(screen.getByRole('checkbox'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(payloadOf(onSave).properties.find((p) => p.key === 'draft')?.value).toBe(false);
  });

  it('adds a new property at top level', async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.click(screen.getByRole('button', { name: /添加属性/ }));
    await user.type(screen.getByPlaceholderText('属性名'), 'reviewer');
    await user.type(screen.getByPlaceholderText('属性值（必填）'), '莫晓{Enter}');
    expect(onSave).toHaveBeenCalledTimes(1);
    const r = payloadOf(onSave);
    expect(r.properties.find((p) => p.key === 'reviewer')?.value).toBe('莫晓');
    expect(r.malformed).toBe(false);
  });

  it('degrades to a warning on malformed YAML without any edit affordance', () => {
    setup({ content: '---\ntitle: "unterminated\n---' });
    expect(screen.getByText(/frontmatter 解析失败/)).toBeInTheDocument();
    expect(screen.queryByText(/添加属性/)).not.toBeInTheDocument();
  });

  it('hides remove and add affordances for non-authors', () => {
    setup({ editable: false });
    expect(screen.queryByRole('button', { name: '移除 frontend' })).not.toBeInTheDocument();
    expect(screen.queryByText(/添加属性/)).not.toBeInTheDocument();
  });

  it('renders nothing for empty read-only documents without frontmatter', () => {
    const { container } = render(
      <DocumentPropertiesPanel content="正文而已" editable={false} onSave={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
