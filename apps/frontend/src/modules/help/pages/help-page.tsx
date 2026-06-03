/**
 * HelpPage - 帮助中心页面
 * 参考: refers/APM/SETTINGS_AND_HELP.md
 * 按照 Figma 设计实现
 */

import { useState } from 'react';
import { HelpCircle, Search, Book, Keyboard, MessageCircle, ExternalLink, ChevronRight } from 'lucide-react';
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

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  articles: HelpArticle[];
}

interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Book className="w-5 h-5" />,
    description: 'Learn the basics and get up and running quickly',
    articles: [
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        summary: 'Get started with APM in 5 minutes',
        content: 'This guide will help you set up your first project and invite team members.',
      },
      {
        id: 'project-creation',
        title: 'Creating Your First Project',
        summary: 'Step-by-step project setup',
        content: 'Learn how to create a project, add tasks, and organize your work.',
      },
      {
        id: 'navigation',
        title: 'Navigating the Interface',
        summary: 'Understanding the APM dashboard',
        content: 'A tour of the main interface and how to use the sidebar navigation.',
      },
    ],
  },
  {
    id: 'features',
    title: 'Features',
    icon: <HelpCircle className="w-5 h-5" />,
    description: 'Explore APM features and capabilities',
    articles: [
      {
        id: 'tasks-management',
        title: 'Task Management',
        summary: 'Create, organize, and track tasks',
        content: 'Learn about task creation, assignment, priorities, and status tracking.',
      },
      {
        id: 'ai-assistant',
        title: 'AI Assistant',
        summary: 'Leverage AI for project management',
        content: 'How to use the AI assistant to automate tasks and gain insights.',
      },
      {
        id: 'integrations',
        title: 'Integrations',
        summary: 'Connect with your favorite tools',
        content: 'Setting up integrations with GitHub, Slack, and other services.',
      },
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    icon: <Keyboard className="w-5 h-5" />,
    description: 'Speed up your workflow with keyboard shortcuts',
    articles: [
      {
        id: 'global-shortcuts',
        title: 'Global Shortcuts',
        summary: 'Shortcuts available everywhere',
        content: 'Ctrl+K: Command Palette, Ctrl+N: New Task, Ctrl+/ : Help',
      },
      {
        id: 'editor-shortcuts',
        title: 'Editor Shortcuts',
        summary: 'Shortcuts for editing tasks and documents',
        content: 'Ctrl+Enter: Save, Escape: Cancel, Tab: Next Field',
      },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: <MessageCircle className="w-5 h-5" />,
    description: 'Frequently asked questions',
    articles: [
      {
        id: 'account',
        title: 'Account & Billing',
        summary: 'Managing your account',
        content: 'Answers about subscription, billing, and account settings.',
      },
      {
        id: 'teams',
        title: 'Teams & Permissions',
        summary: 'Managing team access',
        content: 'How to invite members, set roles, and manage permissions.',
      },
    ],
  },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Open Command Palette' },
  { keys: ['Ctrl', 'N'], action: 'New Task' },
  { keys: ['Ctrl', 'P'], action: 'Quick Project Switch' },
  { keys: ['Ctrl', '/'], action: 'Show Help' },
  { keys: ['Ctrl', 'B'], action: 'Toggle Sidebar' },
  { keys: ['Ctrl', 'Shift', 'A'], action: 'AI Assistant' },
  { keys: ['Esc'], action: 'Close Dialog/Panel' },
  { keys: ['Ctrl', 'S'], action: 'Save Changes' },
];

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('getting-started');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const currentSection = HELP_SECTIONS.find((s) => s.id === selectedSection);
  const currentArticle = currentSection?.articles.find((a) => a.id === selectedArticle);

  const filteredSections = HELP_SECTIONS.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.articles.some(
        (article) =>
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - 使用 PageHeader 组件 */}
      <PageHeader
        title="Help Center"
        description="Find answers and learn how to use APM"
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r flex flex-col shrink-0">
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search help..."
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
                  {section.title}
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
                        {article.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 w-full">
          {currentArticle ? (
            <div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                ← Back to {currentSection?.title}
              </button>
              <h2 className="text-2xl font-bold mb-2">{currentArticle.title}</h2>
              <p className="text-muted-foreground mb-6">{currentArticle.summary}</p>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">{currentArticle.content}</p>
              </div>
            </div>
          ) : currentSection ? (
            <div>
              <h2 className="text-xl font-bold mb-2">{currentSection.title}</h2>
              <p className="text-muted-foreground mb-6">{currentSection.description}</p>
              <div className="grid gap-4">
                {currentSection.articles.map((article) => (
                  <Card
                    key={article.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedArticle(article.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <CardDescription>{article.summary}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{article.content}</p>
                      <Button variant="link" size="sm" className="mt-2 p-0">
                        Read more <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">Search Help Center</h2>
              <p className="text-muted-foreground">
                Use the search box to find articles, guides, and FAQs
              </p>
            </div>
          )}

          {/* Keyboard Shortcuts Section */}
          {selectedSection === 'keyboard-shortcuts' && !selectedArticle && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shortcut</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, i) => (
                              <kbd
                                key={i}
                                className="px-2 py-1 bg-muted rounded text-xs font-mono"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
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
  );
}
