import { describe, expect, it, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PromptsSettingsSection } from './prompts-section';

// base-ui Switch 点击路径依赖 window.PointerEvent（jsdom 缺失）
beforeAll(() => {
  if (typeof (window as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
    (window as unknown as { PointerEvent: unknown }).PointerEvent = class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    };
  }
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts && typeof opts.count === 'number' ? `${key}:${opts.count}` : key,
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/components/ui/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mocks = vi.hoisted(() => ({
  updateConfig: vi.fn(),
  config: {
    toggles: {
      system: true,
      project: false,
      role: true,
      team: true,
      member: true,
      task: true,
      skills: true,
      context: true,
    },
    projectPrompt: null,
  },
  systemItems: [
    { key: 'apm-baseline', title: 'APM 协作基线', description: '行为基线', charCount: 1024 },
    { key: 'apm-report-format', title: '执行结果汇报规范', description: '汇报结构', charCount: 512 },
  ],
  detailByKey: {} as Record<string, { key: string; title: string; description: string; charCount: number; content: string } | undefined>,
}));

vi.mock('@/modules/prompt/api/prompt-api', () => ({
  usePromptConfig: () => ({ data: mocks.config, isLoading: false }),
  useUpdatePromptConfig: () => ({ mutate: mocks.updateConfig, isPending: false }),
  useSystemPrompts: () => ({ data: { items: mocks.systemItems }, isLoading: false }),
  useSystemPromptDetail: (key: string | null) => ({
    data: key ? mocks.detailByKey[key] : undefined,
    isLoading: false,
  }),
}));

describe('PromptsSettingsSection（CAP-A-24 设置 · 提示词分区）', () => {
  it('渲染 8 个注入开关（label 直读 i18n 键）', () => {
    render(<PromptsSettingsSection />);
    expect(screen.getByText('prompts.toggle.system')).toBeTruthy();
    expect(screen.getByText('prompts.toggle.project')).toBeTruthy();
    expect(screen.getByText('prompts.toggle.role')).toBeTruthy();
    expect(screen.getByText('prompts.toggle.team')).toBeTruthy();
    expect(screen.getByText('prompts.toggle.member')).toBeTruthy();
    expect(screen.getByText('prompts.toggle.task')).toBeTruthy();
    expect(screen.getByText('prompts.toggle.skills')).toBeTruthy();
    expect(screen.getByText('prompts.toggle.context')).toBeTruthy();
  });

  it('切换开关经 updateConfig 落库（携带对应键的新值）', () => {
    render(<PromptsSettingsSection />);
    const sw = screen
     .getByText('prompts.toggle.system')
      .closest('div.flex')!
      .parentElement!.querySelector('span[role="switch"]');
    expect(sw).toBeTruthy();
    fireEvent.click(sw!);
    expect(mocks.updateConfig).toHaveBeenCalledWith({ system: false });
  });

  it('系统提示词列表默认选中首项并展示只读全文（含内置徽标）', () => {
    mocks.detailByKey = {
      'apm-baseline': {
        key: 'apm-baseline',
        title: 'APM 协作基线',
        description: '行为基线',
        charCount: 1024,
        content: '# APM 协作基线\n不越权、不虚构。',
      },
    };
    render(<PromptsSettingsSection />);
    expect(screen.getByText('prompts.system.builtin')).toBeTruthy();
    expect(screen.getByText('不越权、不虚构。')).toBeTruthy();
    expect(screen.getByText('prompts.system.charCount:1024')).toBeTruthy();
  });

  it('切换系统提示词条目后展示对应只读全文', () => {
    mocks.detailByKey = {
      'apm-report-format': {
        key: 'apm-report-format',
        title: '执行结果汇报规范',
        description: '汇报结构',
        charCount: 512,
        content: '# 执行结果汇报规范\n结论先行。',
      },
    };
    render(<PromptsSettingsSection />);
    fireEvent.click(screen.getByText('执行结果汇报规范'));
    expect(screen.getByText('结论先行。')).toBeTruthy();
  });
});
