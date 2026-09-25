import type { Decision } from '@/shared/decision-card/types';
import type { Notification } from '../api/notification-api';

export type InboxTab = 'important' | 'other' | 'snoozed' | 'cleared';

export type ActionTone = 'danger' | 'warning' | 'purple' | 'blue' | 'muted';

export interface ActionTag {
  label: string;
  tone: ActionTone;
}

export interface ActionableInboxItem {
  id: string;
  sourceKind: 'decision' | 'notification' | 'assistant';
  category: 'important' | 'other';
  title: string;
  subtitle?: string;
  issueId?: string;
  issueTitle?: string;
  issueType?: 'bug' | 'task' | 'feature' | 'decision' | 'acceptance' | 'doc';
  issueStatus?: 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done';
  actionTag?: ActionTag;
  actor?: {
    name: string;
    isAgent: boolean;
    avatarUrl?: string;
    actionText: string;
  };
  commentCount?: number;
  createdAt: string;
  isUnread: boolean;
  isSnoozed: boolean;
  snoozedUntil?: number;
  isCleared: boolean;
  rawDecision?: Decision;
  rawNotification?: Notification;
}
