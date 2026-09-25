/**
 * 帮助中心「help 不说谎」守卫（P2-26 重写防回归）：
 * - help.* 文案不含不实宣传：历史占位里的 Slack 集成、Ctrl+N / Ctrl+/
 *   等从未实现的键位不得回流（快捷键真相源是 hotkeys 注册表）；
 * - zh-CN / en 键结构成对一致，无缺键（t 缺键会原文暴露 key）；
 * - 章节注册表渲染冒烟：入门指南默认选中、快捷键表按注册表真实键位生成。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n, { resources } from '@/i18n';
import { HOTKEY_DEFINITIONS } from '@/shared/hotkeys/hotkey-definitions';
import { HelpPage } from './help-page';

type LocaleNode = Record<string, unknown>;

function helpNamespace(locale: string): LocaleNode {
  const res = resources as unknown as Record<string, { translation: LocaleNode }>;
  const help = res[locale]?.translation?.help;
  if (!help || typeof help !== 'object') {
    throw new Error(`resources.${locale}.translation.help 缺失`);
  }
  return help as LocaleNode;
}

/** 深收集叶子键（内容键到 title/summary/content 一层为止），比较 zh/en 成对 */
function collectKeys(node: LocaleNode, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return collectKeys(value as LocaleNode, path);
    }
    return [path];
  });
}

function renderHelp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/help']}>
        <HelpPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeAll(async () => {
  await i18n.changeLanguage('zh-CN');
});

describe('help 不说谎（内容真相守卫）', () => {
  it('help.* 文案不含从未存在的功能宣传（Slack / Ctrl+N / Ctrl+/）', () => {
    for (const locale of ['zh-CN', 'en']) {
      const text = JSON.stringify(helpNamespace(locale));
      expect(text, `${locale} 不得再宣传 Slack 集成`).not.toMatch(/slack/i);
      expect(text, `${locale} 不得再宣传 Ctrl+N`).not.toMatch(/Ctrl\+N/i);
      expect(text, `${locale} 不得再宣传 Ctrl+/`).not.toMatch(/Ctrl\+\//i);
    }
  });

  it('zh-CN 与 en 的 help.* 键结构成对一致', () => {
    const zhKeys = collectKeys(helpNamespace('zh-CN')).sort();
    const enKeys = collectKeys(helpNamespace('en')).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it('文章三件套（title/summary/content）均为非空字符串', () => {
    const articles = helpNamespace('zh-CN').articles as LocaleNode;
    for (const [sectionId, sectionArticles] of Object.entries(articles)) {
      for (const [articleId, fields] of Object.entries(sectionArticles as LocaleNode)) {
        for (const field of ['title', 'summary', 'content']) {
          const value = (fields as LocaleNode)[field];
          expect(
            typeof value === 'string' && value.trim().length > 0,
            `${sectionId}.${articleId}.${field} 缺失或为空`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('HelpPage 渲染', () => {
  it('默认选中入门指南：章节、文章与正文按 zh 文案渲染', () => {
    renderHelp();
    expect(screen.getAllByText('入门指南').length).toBeGreaterThan(0);
    // 文章列表与卡片同时出现，用 getAllByText 断言存在
    expect(screen.getAllByText('APM 是什么？').length).toBeGreaterThan(0);
    expect(screen.getAllByText('快速上手').length).toBeGreaterThan(0);
    // 打开文章后正文可见
    fireEvent.click(screen.getAllByText('APM 是什么？')[0]);
    expect(
      screen.getAllByText(/一个 AI 驱动的项目管理工具/).length,
    ).toBeGreaterThan(0);
  });

  it('快捷键表由注册表真实键位生成：注册表每键一行 + Esc 行，无编造键位', () => {
    renderHelp();
    fireEvent.click(screen.getByText('键盘快捷键'));
    // 注册表行：每条 hotkey 的中文动作名可见（如「打开命令面板」）
    expect(screen.getAllByText('打开命令面板').length).toBeGreaterThan(0);
    // 行数 = 注册表条目 + Esc（关闭对话框/面板）
    expect(screen.getAllByText('Esc').length).toBeGreaterThan(0);
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(HOTKEY_DEFINITIONS.length + 1 + 1); // + 表头行
  });

  it('en 渲染冒烟：章节标题使用英文文案', async () => {
    await i18n.changeLanguage('en');
    try {
      renderHelp();
      expect(screen.getAllByText('Getting Started').length).toBeGreaterThan(0);
      expect(screen.getAllByText('AI Teammate').length).toBeGreaterThan(0);
    } finally {
      await i18n.changeLanguage('zh-CN');
    }
  });
});
