import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePendingDecisions } from '@/modules/decision/hooks/use-decisions';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationsCount,
} from './use-notifications';
import type { ActionableInboxItem, InboxTab } from '../types/inbox';
import type { Decision } from '@/shared/decision-card/types';
import type { Notification } from '../api/notification-api';

const STORAGE_KEY_CLEARED = 'apm:inbox:cleared_v1';
const STORAGE_KEY_SNOOZED = 'apm:inbox:snoozed_v1';

function readStoredSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeStoredSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
}

function readStoredMap(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return typeof obj === 'object' && obj !== null ? obj : {};
  } catch {
    return {};
  }
}

function writeStoredMap(key: string, map: Record<string, number>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function useActionableInbox() {
  const [activeTab, setActiveTab] = useState<InboxTab>('important');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'decision' | 'issue' | 'agent'>('all');

  // 1. 决策流（CAP-C-04 决策卡）
  const decisionsQuery = usePendingDecisions();
  const { handleAction: handleDecisionAction, busyId: busyDecisionId } = useDecisionActions();

  // 2. 通知流
  const notificationsQuery = useNotifications({ pageSize: 100 });
  const { data: unreadNotificationsCount = 0 } = useUnreadNotificationsCount();
  const markNotificationsRead = useMarkNotificationsRead();

  // 3. 本地持久化状态：已清理与稍后提醒
  const [clearedIds, setClearedIds] = useState<Set<string>>(() =>
    readStoredSet(STORAGE_KEY_CLEARED),
  );
  const [snoozedMap, setSnoozedMap] = useState<Record<string, number>>(() =>
    readStoredMap(STORAGE_KEY_SNOOZED),
  );
  // 当前时刻经状态供给（60s 粒度，snooze 判定足够）——渲染期保持纯函数，不直调 Date.now
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // 清理过期 snooze（自动唤醒）
  useEffect(() => {
    const now = Date.now();
    let changed = false;
    const nextMap = { ...snoozedMap };
    for (const [id, until] of Object.entries(nextMap)) {
      if (until <= now) {
        delete nextMap[id];
        changed = true;
      }
    }
    if (changed) {
      setSnoozedMap(nextMap);
      writeStoredMap(STORAGE_KEY_SNOOZED, nextMap);
    }
  }, [snoozedMap]);

  // 4. 转换待决决策为 ActionableInboxItem
  const rawDecisions = useMemo(
    () => decisionsQuery.data?.items ?? [],
    [decisionsQuery.data?.items],
  );

  const decisionItems = useMemo<ActionableInboxItem[]>(() => {
    return rawDecisions.map((d: Decision) => {
      const isAcceptance = d.kind === 'acceptance';
      const isBlocking = d.urgency === 'blocking';

      let actionLabel = '等待拍板';
      let actionTone: ActionableInboxItem['actionTag']['tone'] = 'warning';

      if (isAcceptance) {
        actionLabel = '等待验收';
        actionTone = 'purple';
      } else if (isBlocking) {
        actionLabel = '等待拍板';
        actionTone = 'warning';
      } else {
        actionLabel = '待审阅';
        actionTone = 'warning';
      }

      const proposerName = d.proposer?.name || (d.proposer?.type === 'ai_agent' ? 'AI 架构师' : '系统');
      const actionText = isAcceptance
        ? '提交了验收门禁申请，待人评审'
        : isBlocking
          ? '发起了阻断性执行审批'
          : '提供了变更决策提议';

      return {
        id: `dec:${d.id}`,
        sourceKind: 'decision',
        category: 'important',
        title: d.title,
        subtitle: d.detail,
        issueId: d.issueId,
        issueTitle: d.taskTitle,
        issueType: isAcceptance ? 'acceptance' : 'decision',
        issueStatus: isBlocking ? 'blocked' : 'in_review',
        actionTag: {
          label: actionLabel,
          tone: actionTone,
        },
        actor: {
          name: proposerName,
          isAgent: d.proposer?.type === 'ai_agent',
          actionText,
        },
        createdAt: d.createdAt,
        isUnread: true,
        isSnoozed: false,
        isCleared: false,
        rawDecision: d,
      };
    });
  }, [rawDecisions]);

  // 5. 转换通知为 ActionableInboxItem
  const rawNotifications = useMemo(
    () => notificationsQuery.data?.data ?? [],
    [notificationsQuery.data?.data],
  );

  const notificationItems = useMemo<ActionableInboxItem[]>(() => {
    return rawNotifications.map((n: Notification) => {
      const type = n.type;
      const isImportantType =
        type === 'task.assigned' ||
        type === 'mention' ||
        type.startsWith('approval.') ||
        type.startsWith('acceptance.') ||
        type.startsWith('execution.') ||
        type === 'ci.build.failed';

      let actionTag: ActionableInboxItem['actionTag'] | undefined;
      let issueType: ActionableInboxItem['issueType'] = 'task';
      let issueStatus: ActionableInboxItem['issueStatus'] = 'in_progress';

      if (n.title.includes('缺陷') || n.title.toLowerCase().includes('bug')) {
        issueType = 'bug';
      }

      let actorName = '系统通知';
      let isAgent = false;
      let actionText = n.body || n.title;

      if (type === 'task.assigned') {
        actionTag = { label: '指派给你', tone: 'blue' };
        actionText = '把此任务指派给了你';
        actorName = '项目协同';
      } else if (type === 'mention') {
        actionTag = { label: '提到了你', tone: 'blue' };
        actionText = '在评论中提及了你';
      } else if (type.startsWith('approval.')) {
        actionTag = { label: '等待审阅', tone: 'warning' };
        actionText = '发起了待确认操作审批';
        isAgent = true;
        actorName = 'AI 助手';
      } else if (type.startsWith('acceptance.')) {
        actionTag = { label: '等待验收', tone: 'purple' };
        actionText = '提交了交付验收标准';
        issueType = 'acceptance';
        isAgent = true;
        actorName = 'AI 交付把关员';
      } else if (type.startsWith('execution.')) {
        actionTag = { label: '等待回复', tone: 'danger' };
        actionText = '遇到卡点，标记为等待人工回复';
        issueStatus = 'blocked';
        isAgent = true;
        actorName = 'AI 开发者';
      } else if (type === 'task.statusChanged') {
        actionText = n.body || '修改了任务状态';
        actorName = '团队成员';
      } else if (type === 'ci.build.failed') {
        actionTag = { label: '构建阻断', tone: 'danger' };
        issueStatus = 'blocked';
      }

      return {
        id: `notif:${n.id}`,
        sourceKind: 'notification',
        category: isImportantType ? 'important' : 'other',
        title: n.title,
        subtitle: n.body || undefined,
        issueId: n.issueId || undefined,
        issueTitle: n.title,
        issueType,
        issueStatus,
        actionTag,
        actor: {
          name: actorName,
          isAgent,
          actionText,
        },
        createdAt: n.createdAt,
        isUnread: n.status === 'unread',
        isSnoozed: false,
        isCleared: false,
        rawNotification: n,
      };
    });
  }, [rawNotifications]);

  // 6. 全局所有条目聚合与状态分配（稍后 / 已清理）
  const allItems = useMemo(() => {
    const combined = [...decisionItems, ...notificationItems];
    return combined.map((item) => {
      const isCleared = clearedIds.has(item.id);
      const snoozedUntil = snoozedMap[item.id];
      const isSnoozed = !!(snoozedUntil && snoozedUntil > nowMs);

      return {
        ...item,
        isCleared,
        isSnoozed,
        snoozedUntil,
      };
    });
  }, [decisionItems, notificationItems, clearedIds, snoozedMap, nowMs]);

  // 7. Tab 分类列表与统计
  const counts = useMemo(() => {
    let important = 0;
    let other = 0;
    let snoozed = 0;
    let cleared = 0;

    for (const item of allItems) {
      if (item.isCleared) {
        cleared++;
      } else if (item.isSnoozed) {
        snoozed++;
      } else if (item.category === 'important') {
        if (item.isUnread || item.sourceKind === 'decision') {
          important++;
        }
      } else {
        if (item.isUnread) {
          other++;
        }
      }
    }

    return { important, other, snoozed, cleared };
  }, [allItems]);

  // 8. 过滤当前激活 Tab 的列表
  const currentTabItems = useMemo(() => {
    let list = allItems.filter((item) => {
      if (activeTab === 'cleared') return item.isCleared;
      if (activeTab === 'snoozed') return item.isSnoozed && !item.isCleared;
      if (item.isCleared || item.isSnoozed) return false;
      if (activeTab === 'important') return item.category === 'important';
      if (activeTab === 'other') return item.category === 'other';
      return true;
    });

    if (typeFilter !== 'all') {
      if (typeFilter === 'decision') {
        list = list.filter((i) => i.sourceKind === 'decision' || i.issueType === 'decision');
      } else if (typeFilter === 'agent') {
        list = list.filter((i) => i.actor?.isAgent);
      } else if (typeFilter === 'issue') {
        list = list.filter((i) => i.issueType === 'task' || i.issueType === 'bug');
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.actor?.name.toLowerCase().includes(q) ||
          i.actor?.actionText.toLowerCase().includes(q) ||
          (i.issueTitle && i.issueTitle.toLowerCase().includes(q)),
      );
    }

    // 排序：未读优先，最新时间优先
    return list.sort((a, b) => {
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allItems, activeTab, typeFilter, searchQuery]);

  // 9. 动作能力
  const clearItem = useCallback(
    (id: string) => {
      setClearedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        writeStoredSet(STORAGE_KEY_CLEARED, next);
        return next;
      });
      // 如果同时在 snoozed 中，移除
      setSnoozedMap((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        writeStoredMap(STORAGE_KEY_SNOOZED, next);
        return next;
      });
    },
    [],
  );

  const restoreItem = useCallback((id: string) => {
    setClearedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      writeStoredSet(STORAGE_KEY_CLEARED, next);
      return next;
    });
    setSnoozedMap((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      writeStoredMap(STORAGE_KEY_SNOOZED, next);
      return next;
    });
  }, []);

  const snoozeItem = useCallback((id: string, durationMs: number) => {
    const until = Date.now() + durationMs;
    setSnoozedMap((prev) => {
      const next = { ...prev, [id]: until };
      writeStoredMap(STORAGE_KEY_SNOOZED, next);
      return next;
    });
  }, []);

  const clearAllCurrent = useCallback(() => {
    const idsToClear = currentTabItems.map((i) => i.id);
    if (idsToClear.length === 0) return;
    setClearedIds((prev) => {
      const next = new Set(prev);
      idsToClear.forEach((id) => next.add(id));
      writeStoredSet(STORAGE_KEY_CLEARED, next);
      return next;
    });
  }, [currentTabItems]);

  const markAllRead = useCallback(() => {
    const unreadNotificationIds = rawNotifications
      .filter((n) => n.status === 'unread')
      .map((n) => n.id);
    if (unreadNotificationIds.length > 0) {
      markNotificationsRead.mutate(unreadNotificationIds);
    }
  }, [rawNotifications, markNotificationsRead]);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    items: currentTabItems,
    counts,
    isLoading: decisionsQuery.isLoading || notificationsQuery.isLoading,
    isError: decisionsQuery.isError || notificationsQuery.isError,
    refetch: () => {
      decisionsQuery.refetch();
      notificationsQuery.refetch();
    },
    clearItem,
    restoreItem,
    snoozeItem,
    clearAllCurrent,
    markAllRead,
    rawDecisions,
    handleDecisionAction,
    busyDecisionId,
    unreadNotificationsCount,
  };
}
