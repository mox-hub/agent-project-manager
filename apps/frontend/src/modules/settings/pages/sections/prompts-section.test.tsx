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
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts.count === 'number') return `${key}:${opts.count}`;
      if (opts && typeof opts.ratio === 'number') return `${key}:${opts.ratio}:${opts.chars}`;
      return key;
    },
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
      executor: true,
      team: true,
      task: true,
      skills: true,
      context: true,
    },
    projectPrompt: null,
    agentsFile: null,
  },
  systemItems: [
    { key: 'apm-baseline', title: 'APM 协作基线', description: '行为基线', charCount: 1024 },
    { key: 'apm-report-format', title: '执行结果汇报规范', description: '汇报结构', charCount: 512 },
  ],
  detailByKey: {} as Record<string, { key: string; title: string; description: string; charCount: number; content: string } | undefined>,
  usageStats: {
    sampleSize: 50,
    promptCount: 4,
    avgPromptChars: 3600,
    sections: [
      { key: 'system', count: 4, ratio: 1, avgChars: 1024 },
      { key: 'executor', count: 3, ratio: 0.75, avgChars: 210 },
      { key: 'taskBody', count: 4, ratio: 1, avgChars: 640 },
    ],
  },
  templateItems: [
    {
      id: 'builtin:bug-fix-baseline',
      name: 'Bug 修复基线',
      description: '缺陷修复通用规范',
      target: 'task',
      scope: 'workspace',
      projectId: null,
      body: '修复 {{issue.title}}',
      builtIn: true,
      variables: ['issue.title'],
    },
  ],
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

vi.mock('@/modules/prompt/api/prompt-api', () => ({
  usePromptConfig: () => ({ data: mocks.config, isLoading: false }),
  useUpdatePromptConfig: () => ({ mutate: mocks.updateConfig, isPending: false }),
  useSystemPrompts: () => ({ data: { items: mocks.systemItems }, isLoading: false }),
  useSystemPromptDetail: (key: string | null) => ({
    data: key ? mocks.detailByKey[key] : undefined,
    isLoading: false,
  }),
  usePromptUsageStats: () => ({ data: mocks.usageStats, isLoading: false }),
  usePromptTemplates: () => ({ data: { items: mocks.templateItems }, isLoading: false }),
  useCreatePromptTemplate: () => ({ mutateAsync: mocks.createTemplate, isPending: false }),
  useUpdatePromptTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeletePromptTemplate: () => ({ mutate: mocks.deleteTemplate, isPending: false }),
}));

describe('PromptsSettingsSection（CAP-A-24 设置 · 提示词总控）', () => {
  it('渲染 7 个注入开关（增强 C 收敛后：executor 替代 role+member）', () => {
    render(<PromptsSettingsSection />);
    // 开关与注入率统计共用段落名键名，此处取开关区第一组
    expect(screen.getAllByText('prompts.toggle.system').length).toBeGreaterThan(0);
    expect(screen.getAllByText('prompts.toggle.project').length).toBeGreaterThan(0);
    expect(screen.getAllByText('prompts.toggle.executor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('prompts.toggle.team').length).toBeGreaterThan(0);
    expect(screen.getAllByText('prompts.toggle.task').length).toBeGreaterThan(0);
    expect(screen.getAllByText('prompts.toggle.skills').length).toBeGreaterThan(0);
    expect(screen.getAllByText('prompts.toggle.context').length).toBeGreaterThan(0);
    // 旧 role / member 开关不再出现
    expect(screen.queryByText('prompts.toggle.role')).toBeNull();
    expect(screen.queryByText('prompts.toggle.member')).toBeNull();
    expect(screen.getAllByText('prompts.toggle.system').length).toBe(2);
  });

  it('切换开关经 updateConfig 落库（携带对应键的新值）', () => {
    render(<PromptsSettingsSection />);
    const sw = screen
     .getAllByText('prompts.toggle.system')[0]!
      .closest('div.flex')!
      .parentElement!.querySelector('span[role="switch"]');
    expect(sw).toBeTruthy();
    fireEvent.click(sw!);
    expect(mocks.updateConfig).toHaveBeenCalledWith({ system: false });
  });

  it('注入率统计（增强 C）：展示采样规模与各段注入率行', () => {
    render(<PromptsSettingsSection />);
    expect(screen.getByText('prompts.usage.sample:4')).toBeTruthy();
    expect(screen.getByText('prompts.usage.row:100:1024')).toBeTruthy();
    expect(screen.getByText('prompts.usage.row:75:210')).toBeTruthy();
  });

  it('模板库（增强 A）：内置模板渲染 + 复制为自定义走 create', () => {
    render(<PromptsSettingsSection />);
    expect(screen.getByText('Bug 修复基线')).toBeTruthy();
    fireEvent.click(screen.getByText('prompts.templates.duplicate'));
    // 打开编辑弹层（新建态），直接保存走 createTemplate
    fireEvent.click(screen.getByText('prompt.templateEditor.save'));
    expect(mocks.createTemplate).toHaveBeenCalled();
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
