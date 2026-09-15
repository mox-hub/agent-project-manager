import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { SurfaceNarration } from '../adapters/surface-narration';
import { SurfaceNarrationBar } from './surface-narration-bar';

/**
 * 顶栏总述的渲染守卫（ARCH-AISURFACE-001 §3.3）。
 *
 * 这里守的不是"好不好看"，而是**三件会骗到人的事**：
 * ① 降级必须**看得出来**——规则拼的句子若与 AI 判断长得一模一样，
 *    功能没挂、可信度挂了，这是降级里最坏的一种失败；
 * ② 没有事实就**不占位**，也不说"暂无"来填坑；
 * ③ 开销回执缺失时**不编**金额——`costUsd: null`（口径不可用）不能渲染成 `$0.000`。
 */

const aiNarration = (over: Partial<SurfaceNarration> = {}): SurfaceNarration => ({
  headline: '一切正常，小周在写登录页，还需要你拍板 2 件事',
  highlights: ['登录页卡在测试没过，AI 已自己重试 2 次'],
  blockers: [
    {
      what: '登录页卡在测试',
      who: '小周',
      since: '小周 这次执行从 2026-09-15T05:00:00.000Z 开始',
      why: '接口没通',
      whatYouCanDo: '去验收页看看',
    },
  ],
  needsYou: [
    { decisionId: 'release:rel-1', oneLineWhy: '发版门禁没过', urgency: 'blocking' },
  ],
  honestGaps: ['这条流水线只有步骤级进度，没有实时日志'],
  source: 'ai',
  ...over,
});

const templateNarration = (over: Partial<SurfaceNarration> = {}): SurfaceNarration =>
  aiNarration({ source: 'template', ...over });

const renderBar = (props: Partial<Parameters<typeof SurfaceNarrationBar>[0]> = {}) =>
  render(
    <SurfaceNarrationBar
      narration={aiNarration()}
      state="ready"
      generatedAt={Date.now()}
      {...props}
    />,
  );

describe('SurfaceNarrationBar', () => {
  it('没有事实可讲时整块不渲染——不占位、也不说"暂无"填坑', () => {
    const { container } = renderBar({ narration: null, state: 'idle' });

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/暂无/)).not.toBeInTheDocument();
  });

  it('读取中说的是"正在读盘"，不是一个像结论的句子', () => {
    renderBar({ narration: null, state: 'pending' });

    expect(screen.getByText('正在读盘…')).toBeInTheDocument();
  });

  it('AI 态：逐段呈现，并标注出处是 AI 读盘（不是规则生成）', () => {
    renderBar();

    expect(screen.getByText(aiNarration().headline)).toBeInTheDocument();
    expect(screen.getByText(/登录页卡在测试没过，AI 已自己重试 2 次/)).toBeInTheDocument();
    expect(screen.getByText(/接口没通/)).toBeInTheDocument();
    // 出处标在 AI 一侧，且不得出现降级标
    expect(screen.getByText('AI 读盘')).toBeInTheDocument();
    expect(screen.queryByText('规则生成的摘要')).not.toBeInTheDocument();
  });

  it('★ 降级必须看得出来：规则生成的摘要就地打标，并把原因挂在悬停上', () => {
    renderBar({
      narration: templateNarration(),
      state: 'degraded',
      degradedNote: '当前没有可用的 AI 模型，以下为规则生成的摘要',
    });

    const tag = screen.getByText('规则生成的摘要');
    expect(tag).toBeInTheDocument();
    // 同一段文字若不打标，读者会当成 AI 的判断——这是本用例钉死的事
    expect(screen.queryByText('AI 读盘')).not.toBeInTheDocument();
    expect(
      tag.closest('[data-ai-component="ai-surface.narration.degraded-tag"]'),
    ).toBeTruthy();
    expect(tag.closest('[title]')?.getAttribute('title')).toContain('没有可用的 AI 模型');
    // 降级不等于空白：内容照常给
    expect(screen.getByText(templateNarration().headline)).toBeInTheDocument();
  });

  it('待拍板只给"为什么需要你"，且不给动作——不构成第二个拍板入口', () => {
    renderBar({ onRefresh: vi.fn() });

    expect(screen.getByText(/发版门禁没过/)).toBeInTheDocument();
    // 整块只有刷新一个按钮，没有任何决议动作
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute('data-ai-action')).toBe(
      'ai-surface.narration.refresh',
    );
  });

  it('待拍板在条内最多呈现 2 条（其余仍在右栏待办区，不在此重复）', () => {
    renderBar({
      narration: aiNarration({
        needsYou: [
          { decisionId: 'a', oneLineWhy: '第一件事' },
          { decisionId: 'b', oneLineWhy: '第二件事' },
          { decisionId: 'c', oneLineWhy: '第三件事' },
        ],
      }),
    });

    expect(screen.getByText(/第一件事/)).toBeInTheDocument();
    expect(screen.getByText(/第二件事/)).toBeInTheDocument();
    expect(screen.queryByText(/第三件事/)).not.toBeInTheDocument();
  });

  it('开销可见：token 与模型经双轨徽章呈现', () => {
    renderBar({
      usage: {
        promptTokens: 900,
        completionTokens: 300,
        totalTokens: 1200,
        costUsd: 0.0123,
        model: 'claude-sonnet-5',
        durationMs: 1800,
      },
    });

    const pill = document.querySelector('[data-ai-component="dual-track-metric-pill"]');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toContain('1.2k');
    expect(pill?.textContent).toContain('0.012');
    expect(pill?.textContent).toContain('claude-sonnet-5');
  });

  it('★ 估价口径不可用（costUsd: null）时不写 $0——"没算出来"不是"没花钱"', () => {
    renderBar({
      usage: {
        promptTokens: 900,
        completionTokens: 300,
        totalTokens: 1200,
        costUsd: null,
        durationMs: 1800,
      },
    });

    const pill = document.querySelector('[data-ai-component="dual-track-metric-pill"]');
    expect(pill?.textContent).toContain('1.2k');
    expect(pill?.textContent).not.toContain('$');
  });

  it('provider 未上报 token 时整个开销徽章缺席，不补 0', () => {
    renderBar({ usage: undefined });

    const pill = document.querySelector('[data-ai-component="dual-track-metric-pill"]');
    expect(pill).toBeNull();
  });

  it('刷新是用户显式意图，且标题说清了它会花掉一次调用', () => {
    const onRefresh = vi.fn();
    renderBar({ onRefresh });

    const button = screen.getByRole('button');
    expect(button.getAttribute('title')).toContain('消耗一次模型调用');
    fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('空数组区段不渲染——不留空标题', () => {
    renderBar({
      narration: aiNarration({ highlights: [], blockers: [], honestGaps: [], needsYou: [] }),
    });

    expect(screen.getByText(aiNarration().headline)).toBeInTheDocument();
    expect(screen.queryByText('ⓘ', { exact: false })).not.toBeInTheDocument();
  });
});
