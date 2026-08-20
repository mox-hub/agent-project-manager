/**
 * TabsContext - 全局 Tab 上下文管理
 * 参考: refers/APM/UPDATE_V23.2.md
 *
 * 标签页的显示规则由 tabs-registry.ts 集中管理，这里只负责状态与操作。
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { matchTabRoute } from '@/shared/tabs/tabs-registry';

// Tab 接口
export interface Tab {
  id: string;
  path: string;
  title: string;
  titleKey?: string; // 翻译键
  icon?: LucideIcon;
  statusIcon?: LucideIcon; // 详情页专用：状态图标（覆盖 icon）
  closable: boolean;
  pinned?: boolean; // 固定标签页
}

// Tab 上下文接口
interface TabsContextValue {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Omit<Tab, 'id'>) => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  isTabOpen: (path: string) => boolean;
  updateTab: (id: string, patch: Partial<Omit<Tab, 'id'>>) => void;
  updateTabByPath: (path: string, patch: Partial<Omit<Tab, 'id'>>) => void;
  togglePin: (id: string) => void;
  closeOthers: (id: string) => void;
  closeRight: (id: string) => void;
  closeAll: () => void;
}

// 创建上下文
const TabsContext = createContext<TabsContextValue | null>(null);

// 生成唯一 ID
function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      // 从注册表解析显示配置（集中管理）
      const config = matchTabRoute(currentPath);
      if (config) {
        const pinned = config.pinnedByDefault ?? false;
        const newTab: Tab = {
          id: generateTabId(),
          path: currentPath,
          title: config.titleKey ?? config.title ?? currentPath,
          titleKey: config.titleKey,
          icon: config.icon,
          closable: config.closable ?? true,
          pinned,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
      }
    }
  }, [location.pathname, tabs]);

  // 打开 Tab
  const openTab = useCallback((tab: Omit<Tab, 'id'>) => {
    navigate(tab.path);
  }, [navigate]);

  // 关闭 Tab（固定页不可关闭）
  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target || target.pinned) {
        // 固定页忽略关闭
        if (target?.pinned) return prev;
      }
      const tabIndex = prev.findIndex((t) => t.id === id);
      const newTabs = prev.filter((t) => t.id !== id);

      // 如果关闭的是当前活动 Tab，切换到相邻的 Tab
      if (activeTabId === id && newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        const newActiveTab = newTabs[newActiveIndex];
        setActiveTabId(newActiveTab.id);
        navigate(newActiveTab.path);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
        navigate('/app/projects');
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

  // 固定 / 取消固定（固定页排到最前，取消固定排到末尾）
  const togglePin = useCallback((id: string) => {
    setTabs((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      const willPin = !(target.pinned ?? false);
      const others = prev.filter((t) => t.id !== id);
      const pinned = others.filter((t) => t.pinned);
      const unpinned = others.filter((t) => !t.pinned);
      const updated = { ...target, pinned: willPin };
      return willPin
        ? [updated, ...pinned, ...unpinned]
        : [...pinned, ...unpinned, updated];
    });
  }, []);

  // 关闭其他标签页（保留固定的与自身）
  const closeOthers = useCallback((id: string) => {
    setTabs((prev) => {
      const keep = prev.filter((t) => t.id === id || t.pinned);
      if (activeTabId === id) {
        setActiveTabId(id);
      }
      return keep;
    });
  }, [activeTabId]);

  // 关闭右侧标签页（保留固定的）
  const closeRight = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const keep = prev.filter((t, i) => i <= idx || t.pinned);
      return keep;
    });
  }, []);

  // 关闭全部（仅保留固定页）
  const closeAll = useCallback(() => {
    setTabs((prev) => {
      const pinnedOnly = prev.filter((t) => t.pinned);
      if (pinnedOnly.length === 0) {
        setActiveTabId(null);
        navigate('/app/projects');
      } else if (activeTabId !== null && !pinnedOnly.some((t) => t.id === activeTabId)) {
        setActiveTabId(pinnedOnly[pinnedOnly.length - 1].id);
      }
      return pinnedOnly;
    });
  }, [activeTabId, navigate]);

  // 检查路径是否已打开
  const isTabOpen = useCallback((path: string) => {
    return tabs.some((t) => t.path === path);
  }, [tabs]);

  // 通过 ID 更新 Tab
  const updateTab = useCallback((id: string, patch: Partial<Omit<Tab, 'id'>>) => {
    setTabs((prev) => prev.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)));
  }, []);

  // 通过 path 更新 Tab（详情页常用）
  const updateTabByPath = useCallback((path: string, patch: Partial<Omit<Tab, 'id'>>) => {
    setTabs((prev) => prev.map((tab) => (tab.path === path ? { ...tab, ...patch } : tab)));
  }, []);

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        switchTab,
        isTabOpen,
        updateTab,
        updateTabByPath,
        togglePin,
        closeOthers,
        closeRight,
        closeAll,
      }}
    >
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
