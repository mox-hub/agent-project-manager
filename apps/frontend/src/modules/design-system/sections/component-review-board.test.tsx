import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { COMPONENT_REGISTRY, type ComponentEntry } from '../registry';
import { ComponentReviewBoard } from './component-review-board';

// 本测试是批 4 的**「标记可见」证据**：断言不是手抄清单，而是直接从 registry.ts
// 派生期望值，再逐条要求它出现在渲染输出里——registry 改了而页面没跟上，这里就红。
// 背景（人类原话）：「组件仍然不删除，但是要在 design-system 页面标记，我看过后再删。」
// 改造前 design-system-page 不 import registry.ts，18 条 review 在页面上看不到。
const REVIEW_ENTRIES = COMPONENT_REGISTRY.filter((e) => e.status === 'review');
const STANDBY_ENTRIES = COMPONENT_REGISTRY.filter((e) => e.status === 'standby');

const metaLine = (entry: ComponentEntry) =>
  `${entry.file} · 登记分区 ${entry.section}`;
const deadlineLine = (entry: ComponentEntry) =>
  `审阅期限 reviewBy：${entry.reviewBy ?? '未登记'} · 清退期限 expiresAt：${
    entry.expiresAt ?? '未登记'
  }`;

function expectEntryVisible(entry: ComponentEntry) {
  // 组件名（registry 内唯一）
  expect(screen.getByText(entry.name)).toBeInTheDocument();
  // 文件路径 + 登记分区（file 在 registry 内唯一 → 断言逐条对齐，不是"大概渲染了"）
  expect(screen.getByText(metaLine(entry))).toBeInTheDocument();
  // reviewBy / expiresAt（缺则显示"未登记"，不臆造）
  expect(screen.getAllByText(deadlineLine(entry)).length).toBeGreaterThan(0);
  // 理由 / 备注
  if (entry.review?.reason) {
    expect(screen.getAllByText(`理由：${entry.review.reason}`).length).toBeGreaterThan(0);
  }
}

describe('ComponentReviewBoard（组件裁决面）', () => {
  it('渲染出的 review / standby 条数与 registry 完全一致（一条都不许漏）', () => {
    render(<ComponentReviewBoard />);

    // 2026-09-29 裁决收口：review 态清零是合法终态（36 条已全部裁决入账
    // component-review-decisions.json），不再断言非空；standby 仍有 17 条作非空锚点。
    expect(STANDBY_ENTRIES.length).toBeGreaterThan(0);

    // query 而非 get：review=0 时页面无 R# 序号，getAllByText 会抛错而非返回空数组
    expect(screen.queryAllByText(/^R#\d+$/)).toHaveLength(REVIEW_ENTRIES.length);
    expect(screen.queryAllByText(/^S#\d+$/)).toHaveLength(STANDBY_ENTRIES.length);
  });

  it('registry 的每一条 review 都逐条呈现在页面上（名 / 路径 / 期限 / 理由）', () => {
    render(<ComponentReviewBoard />);
    for (const entry of REVIEW_ENTRIES) expectEntryVisible(entry);
  });

  it('registry 的每一条 standby 也都呈现在页面上', () => {
    render(<ComponentReviewBoard />);
    for (const entry of STANDBY_ENTRIES) expectEntryVisible(entry);
  });

  it('治理仪表展示的五态计数与 registry 实时统计一致', () => {
    render(<ComponentReviewBoard />);
    const counts = { canonical: 0, standby: 0, internal: 0, review: 0, deprecated: 0 };
    for (const entry of COMPONENT_REGISTRY) counts[entry.status] += 1;

    expect(screen.getByText('总登记')).toBeInTheDocument();
    for (const status of ['canonical', 'standby', 'internal', 'review', 'deprecated'] as const) {
      // 仪表里每个状态名 + 计数值成对出现
      expect(screen.getByText(status)).toBeInTheDocument();
      expect(screen.getAllByText(String(counts[status])).length).toBeGreaterThan(0);
    }
    expect(COMPONENT_REGISTRY.length).toBe(
      counts.canonical + counts.standby + counts.internal + counts.review + counts.deprecated,
    );
  });

  it('「只看待裁决」筛选：standby 组隐藏，review 组条数与 registry 一致', () => {
    render(<ComponentReviewBoard />);

    // 初始：两个组都在（standby 非空；review 组条数与 registry 一致，0 条合法）
    expect(screen.queryAllByText(/^S#\d+$/)).toHaveLength(STANDBY_ENTRIES.length);
    expect(screen.queryAllByText(/^R#\d+$/)).toHaveLength(REVIEW_ENTRIES.length);

    // 包在 act 内：状态更新必须被 React 冲洗完再断言（否则测试通过但输出 act 警告）
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /只看待裁决/ }));
    });

    // 筛选后：standby 组整块隐藏，review 组一条不少
    expect(screen.queryAllByText(/^S#\d+$/)).toHaveLength(0);
    expect(screen.queryAllByText(/^R#\d+$/)).toHaveLength(REVIEW_ENTRIES.length);
    for (const entry of REVIEW_ENTRIES) expectEntryVisible(entry);
  });

  it('本区是只读标记面：不出现任何删除动作入口（零删除的界面侧自证）', () => {
    render(<ComponentReviewBoard />);
    for (const label of [/删除/, /清退执行/, /deprecate/]) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
    expect(screen.getByText(/组件文件、测试、导出一律原样保留/)).toBeInTheDocument();
  });
});
