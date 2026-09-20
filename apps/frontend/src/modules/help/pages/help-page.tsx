/**
 * HelpPage - 帮助中心页面
 * 参考: refers/APM/SETTINGS_AND_HELP.md
 * 按照 Figma 设计实现
 *
 * 内容原则（help 不说谎，P2-26 重写）：
 * - 章节与文章只描述真实存在的功能，入口路径与 router.tsx / 侧边导航 /
 *   命令面板注册表（shared/command-palette/commands.ts）对齐；
 * - 快捷键全部来自 hotkeys 注册表（CAP-A-17 单一真相源），历史占位里
 *   宣传过的 Slack 集成、Ctrl+N / Ctrl+/ 等从未实现的条目已清除；
 * - 全部文案走 help.* i18n（zh-CN 完整、en 同步），组件只持 id 不持文案。
 */

import { useState } from 'react';
import {
  HelpCircle,
  Search,
  Book,
  Keyboard,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  ListTodo,
  Bot,
  ShieldCheck,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageShell } from '@/components/ui/page-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { IconStack } from '@/components/ui/icon-stack';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useTranslation } from '@/hooks/useTranslation';
import { HOTKEY_DEFINITIONS } from '@/shared/hotkeys/hotkey-definitions';
import { getEffectiveCombo } from '@/shared/hotkeys/hotkey-store';
import { formatComboForDisplay } from '@/shared/hotkeys/hotkey-utils';

interface HelpArticleRef {
  id: string;
}

interface HelpSectionDef {
  id: string;
  icon: React.ReactNode;
  articles: HelpArticleRef[];
}

/** 文案键约定：help.articles.<sectionId>.<articleId>.<title|summary|content> */
const articleKey = (sectionId: string, articleId: string, field: 'title' | 'summary' | 'content') =>
  `help.articles.${sectionId}.${articleId}.${field}`;

/**
 * 快捷键表（CAP-A-17 注册表驱动）：全部组（含只读的场景键）从 hotkey 注册表
 * 取当前生效键（含用户自定义），另补真实存在的 Esc 关闭行为。
 * 历史上宣传过但从未实现的键位（Ctrl+N/P/B、Ctrl+Shift+A、Ctrl+/）已删除——help 不说谎。
 */
function getKeyboardShortcuts(t: ReturnType<typeof useTranslation>['t']) {
  const registryRows = HOTKEY_DEFINITIONS.map((def) => ({
    keys: formatComboForDisplay(getEffectiveCombo(def.id) ?? def.defaultKeys),
    action: t(def.labelKey),
  }));
  return [...registryRows, { keys: ['Esc'], action: t('help.shortcuts.closeDialog') }];
}

/**
 * 章节注册表：只持 id 与图标，全部文案经 i18n 解析。
 * 章节按真实功能域组织：入门 → 项目与任务 → AI 同事 → 质量与治理 →
 * 集成与工具 → 快捷键 → FAQ。
 */
const HELP_SECTIONS: HelpSectionDef[] = [
  {
    id: 'getting-started',
    icon: <Book className="w-5 h-5" />,
    articles: [{ id: 'what-is-apm' }, { id: 'quick-start' }, { id: 'navigation' }],
  },
  {
    id: 'projects-issues',
    icon: <ListTodo className="w-5 h-5" />,
    articles: [{ id: 'projects' }, { id: 'issues' }, { id: 'batch' }, { id: 'iterations' }],
  },
  {
    id: 'ai',
    icon: <Bot className="w-5 h-5" />,
    articles: [{ id: 'what-ai-can-do' }, { id: 'configure-ai' }, { id: 'executions' }],
  },
  {
    id: 'governance',
    icon: <ShieldCheck className="w-5 h-5" />,
    articles: [
      { id: 'acceptance' },
      { id: 'decisions' },
      { id: 'documents-contracts' },
      { id: 'releases' },
    ],
  },
  {
    id: 'tools',
    icon: <Plug className="w-5 h-5" />,
    articles: [
      { id: 'integrations' },
      { id: 'search' },
      { id: 'notifications' },
      { id: 'members-teams' },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    icon: <Keyboard className="w-5 h-5" />,
    articles: [{ id: 'overview' }, { id: 'customize' }],
  },
  {
    id: 'faq',
    icon: <MessageCircle className="w-5 h-5" />,
    articles: [{ id: 'where-is-data' }, { id: 'ai-not-responding' }, { id: 'web-vs-desktop' }],
  },
];

export function HelpPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('getting-started');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const KEYBOARD_SHORTCUTS = getKeyboardShortcuts(t);

  const currentSection = HELP_SECTIONS.find((s) => s.id === selectedSection);
  const currentArticle = currentSection?.articles.find((a) => a.id === selectedArticle);

  // 搜索匹配译文（标题/摘要），而非 id
  const query = searchQuery.trim().toLowerCase();
  const filteredSections = HELP_SECTIONS.filter((section) => {
    if (!query) return true;
    const sectionMatched =
      t(`help.sections.${section.id}`).toLowerCase().includes(query) ||
      t(`help.sectionDescriptions.${section.id}`).toLowerCase().includes(query);
    const articleMatched = section.articles.some((article) =>
      (['title', 'summary'] as const).some((field) =>
        t(articleKey(section.id, article.id, field)).toLowerCase().includes(query),
      ),
    );
    return sectionMatched || articleMatched;
  });

  return (
    <PageShell className="overflow-hidden">
<div className="flex flex-col h-full overflow-hidden">
      {/* Header - 使用 PageHeader 组件 */}
      <PageHeader
        title={t('help.title')}
        icon={HelpCircle}
        iconColor="text-accent-blue"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r flex flex-col shrink-0">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('help.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Sections */}
          <div className="flex-1 overflow-auto p-4">
            {filteredSections.map((section) => (
              <div key={section.id} className="mb-4">
                <button
                  onClick={() => {
                    setSelectedSection(section.id);
                    setSelectedArticle(null);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors',
                    selectedSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  {section.icon}
                  {t(`help.sections.${section.id}`)}
                </button>
                {selectedSection === section.id && (
                  <div className="ml-8 mt-1 space-y-1">
                    {section.articles.map((article) => (
                      <button
                        key={article.id}
                        onClick={() => setSelectedArticle(article.id)}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-left text-xs transition-colors',
                          selectedArticle === article.id
                            ? 'bg-primary/5 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <ChevronRight className="w-3 h-3" />
                        {t(articleKey(section.id, article.id, 'title'))}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-6 sm:px-8 sm:py-8 w-full">
          <div className="mx-auto w-full max-w-4xl space-y-6">
          {currentArticle ? (
            <div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                ← {t('help.backTo', { section: currentSection ? t(`help.sections.${currentSection.id}`) : '' })}
              </button>
              <h2 className="text-2xl font-bold mb-2">
                {t(articleKey(currentSection?.id ?? '', currentArticle.id, 'title'))}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t(articleKey(currentSection?.id ?? '', currentArticle.id, 'summary'))}
              </p>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground whitespace-pre-line">
                  {t(articleKey(currentSection?.id ?? '', currentArticle.id, 'content'))}
                </p>
              </div>
            </div>
          ) : currentSection ? (
            <div>
              <h2 className="text-xl font-bold mb-2">{t(`help.sections.${currentSection.id}`)}</h2>
              <p className="text-muted-foreground mb-6">
                {t(`help.sectionDescriptions.${currentSection.id}`)}
              </p>
              <div className="grid gap-4">
                {currentSection.articles.map((article) => (
                  <Card
                    key={article.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedArticle(article.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {t(articleKey(currentSection.id, article.id, 'title'))}
                      </CardTitle>
                      <CardDescription>
                        {t(articleKey(currentSection.id, article.id, 'summary'))}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {t(articleKey(currentSection.id, article.id, 'content'))}
                      </p>
                      <Button variant="link" size="sm" className="mt-2 p-0">
                        {t('help.readMore')} <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              variant="page"
              visual={
                <IconStack aria-hidden="true" className="text-accent-blue">
                  <Book className="size-4 text-accent-blue" />
                </IconStack>
              }
              title={t('help.searchTitle')}
              description={t('help.searchHint')}
            />
          )}

          {/* Keyboard Shortcuts Section */}
          {selectedSection === 'keyboard-shortcuts' && !selectedArticle && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">{t('help.shortcuts.title')}</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('help.shortcuts.shortcut')}</TableHead>
                      <TableHead>{t('help.shortcuts.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <KbdGroup>
                            {shortcut.keys.map((key, i) => (
                              <Kbd key={i}>{key}</Kbd>
                            ))}
                          </KbdGroup>
                        </TableCell>
                        <TableCell className="text-sm">{shortcut.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
    </PageShell>

  );
}
