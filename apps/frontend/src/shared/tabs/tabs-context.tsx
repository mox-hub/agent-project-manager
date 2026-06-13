/**
 * TabsContext - 全局 Tab 上下文管理
 * 参考: refers/APM/UPDATE_V23.2.md
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  FileText,
  Bot,
  BarChart3,
  Bell,
  Plug,
  GitBranch,
  TerminalSquare,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

// Tab 接口
export interface Tab {
  id: string;
  path: string;
  title: string;
  titleKey?: string; // 翻译键
  icon?: LucideIcon;
  closable: boolean;
}

// Tab 上下文接口
interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Omit<Tab, 'id'>) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  isTabOpen: (path: string) => boolean;
}

// 路由配置 - 用于动态生成 Tab (使用翻译键)
const ROUTE_CONFIG: Record<string, { titleKey: string; icon: LucideIcon }> = {
  '/app': { titleKey: 'nav.projects', icon: FolderKanban },
  '/app/projects': { titleKey: 'nav.projects', icon: FolderKanban },
  '/app/projects/dashboard': { titleKey: 'nav.dashboard', icon: LayoutDashboard },
  '/app/tasks': { titleKey: 'nav.tasks', icon: CheckSquare },
  '/app/bugs': { titleKey: 'task.bug.title', icon: AlertCircle },
  '/app/documents': { titleKey: 'document.title', icon: FileText },
  '/app/ai': { titleKey: 'nav.ai', icon: Bot },
  '/app/ai/management': { titleKey: 'nav.aiManagement', icon: Bot },
  '/app/analytics': { titleKey: 'nav.analytics', icon: BarChart3 },
  '/app/notifications': { titleKey: 'nav.notifications', icon: Bell },
  '/app/integrations': { titleKey: 'nav.integrations', icon: Plug },
  '/app/repositories': { titleKey: 'nav.repositories', icon: GitBranch },
  '/app/terminal': { titleKey: 'nav.terminal', icon: TerminalSquare },
  '/app/settings': { titleKey: 'nav.settings', icon: Settings },
  '/app/help': { titleKey: 'nav.help', icon: HelpCircle },
};

// 创建上下文
const TabsContext = createContext<TabsContextValue | null>(null);

// 生成唯一 ID
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 匹配路由到配置
function matchRoute(path: string): { titleKey: string; icon: LucideIcon } | null {
  // 精确匹配
  if (ROUTE_CONFIG[path]) {
    return ROUTE_CONFIG[path];
  }

  // 前缀匹配（对于项目路由如 /projects/:id）
  const prefixes = [
    '/app/projects/',
    '/app/ai/',
    '/app/documents/',
    '/app/terminal/',
  ];

  for (const prefix of prefixes) {
    if (path.startsWith(prefix)) {
      // 返回通用配置
      if (prefix === '/app/projects/') {
        return { titleKey: 'project.title', icon: FolderKanban };
      }
      if (prefix === '/app/ai/') {
        return { titleKey: 'nav.ai', icon: Bot };
      }
      if (prefix === '/app/documents/') {
        return { titleKey: 'document.title', icon: FileText };
      }
      if (prefix === '/app/terminal/') {
        return { titleKey: 'nav.terminal', icon: TerminalSquare };
      }
    }
  }

  return null;
}

// Tab Provider
export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // 监听路由变化，自动创建或切换 tab
  useEffect(() => {
    const currentPath = location.pathname;

    // 检查是否已存在相同路径的 Tab
    const existingTab = tabs.find((t) => t.path === currentPath);
    if (existingTab) {
      // 切换到已存在的 tab
      setActiveTabId(existingTab.id);
    } else {
      // 创建新 tab
      const config = matchRoute(currentPath);
      if (config) {
        const newTab: Tab = {
          id: generateTabId(),
          path: currentPath,
          title: config.titleKey, // 使用翻译键作为临时显示文本
          titleKey: config.titleKey,
          icon: config.icon,
          closable: true,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  }, [location.pathname]);

  // 打开 Tab
  const openTab = useCallback((tab: Omit<Tab, 'id'>) => {
    navigate(tab.path);
  }, [navigate]);

  // 关闭 Tab
  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const tabIndex = prev.findIndex((t) => t.id === id);
      const newTabs = prev.filter((t) => t.id !== id);

      // 如果关闭的是当前活动 Tab，切换到相邻的 Tab
      if (activeTabId === id && newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        const newActiveTab = newTabs[newActiveIndex];
        setActiveTabId(newActiveTab.id);
        // 导航到剩余 tab 对应的页面
        navigate(newActiveTab.path);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
        // 如果所有 tab 都关闭，导航到首页
        navigate('/app/projects');
      } else {
        // 只是移除 tab，不需要导航
        // 保持当前 activeTabId（如果关闭的不是当前 tab）
      }

      return newTabs;
    });
  }, [activeTabId, navigate]);

  // 切换 Tab
  const switchTab = useCallback((id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab) {
      setActiveTabId(id);
      navigate(tab.path);
    }
  }, [tabs, navigate]);

  // 检查路径是否已打开
  const isTabOpen = useCallback((path: string) => {
    return tabs.some((t) => t.path === path);
  }, [tabs]);

  return (
    <TabsContext.Provider value={{ tabs, activeTabId, openTab, closeTab, switchTab, isTabOpen }}>
      {children}
    </TabsContext.Provider>
  );
}

// Hook
export function useTabs(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}
