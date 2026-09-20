/**
 * 通知设置 —— 通知模块附属的个人设置面板（参考 Linear 通知设置，图2）。
 * 收件箱通知六类开关映射 NotificationPreference.eventType（未配置 = 默认开启）；
 * 系统通知为浏览器原生横幅（App 失焦时弹出），偏好同样落库（system.desktop）。
 * 服务端 PUT /notifications/preferences 为 upsert 语义，逐项单独保存。
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { SkeletonText } from '@/components/ui/skeleton';
import { notificationApi } from '../api/notification-api';
import type { NotificationPreferenceItem } from '../api/notification-api';

interface SettingItem {
  eventType: string;
  title: string;
  description: string;
}

interface SettingSection {
  key: string;
  title: string;
  description: string;
  items: SettingItem[];
}

const SETTING_SECTIONS: SettingSection[] = [
  {
    key: 'inbox',
    title: '收件箱通知',
    description:
      '控制哪些事件会产生收件箱通知。被静默的事件类型仍然存在——可以直接到任务页面查看。',
    items: [
      { eventType: 'task.assigned', title: '分配', description: '你被分配或取消分配某个任务时' },
      {
        eventType: 'task.statusChanged',
        title: '状态变更',
        description: '你订阅的任务状态变化时（例如 todo、in_progress、done）',
      },
      { eventType: 'task.commented', title: '评论', description: '你订阅的任务有新评论时' },
      { eventType: 'mention.created', title: '提及', description: '有人 @ 你时，包括 @all 和 squad' },
      {
        eventType: 'task.fieldChanged',
        title: '优先级与截止日期',
        description: '你订阅的任务优先级或截止日期变更时',
      },
      { eventType: 'execution.terminal', title: '智能体活动', description: '智能体 task 完成或失败时' },
    ],
  },
  {
    key: 'system',
    title: '系统通知',
    description: '控制 App 在后台时是否显示操作系统的原生通知横幅。',
    items: [
      {
        eventType: 'system.desktop',
        title: '显示系统通知',
        description: 'App 未获得焦点时，新的收件箱条目通过操作系统弹出通知横幅。',
      },
    ],
  },
];

export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationApi.getPreferences(),
    enabled: open,
  });
  // 开关态 = 服务端行派生（默认开启，全局行覆盖）⊕ 本地切换覆盖；无 effect 同步
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const prefMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const section of SETTING_SECTIONS) {
      for (const item of section.items) map.set(item.eventType, true);
    }
    for (const row of rows ?? []) {
      // 只认全局偏好行（projectId 为空）；项目级偏好不驱动全局开关
      if (row.projectId != null) continue;
      if (map.has(row.eventType)) map.set(row.eventType, row.enabled);
    }
    return map;
  }, [rows]);

  const enabledFor = (eventType: string) =>
    overrides[eventType] ?? prefMap.get(eventType) ?? true;

  const handleToggle = (item: SettingItem, enabled: boolean) => {
    setOverrides((prev) => ({ ...prev, [item.eventType]: enabled }));
    if (item.eventType === 'system.desktop' && enabled && typeof Notification !== 'undefined') {
      void Notification.requestPermission();
    }
    const payload: NotificationPreferenceItem = {
      eventType: item.eventType,
      channels: ['in-app'],
      enabled,
    };
    setSaving(item.eventType);
    notificationApi
      .updatePreferences({ preferences: [payload] })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      })
      .finally(() => setSaving(null));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-150 overflow-y-auto" showCloseButton>
        <div className="space-y-6">
          <div>
            <DialogTitle className="text-lg font-semibold">通知</DialogTitle>
            <DialogDescription className="sr-only">个人通知设置</DialogDescription>
          </div>
          {isLoading ? (
            <SkeletonText lines={6} />
          ) : (
            SETTING_SECTIONS.map((section) => (
              <section key={section.key}>
                <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{section.description}</p>
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {section.items.map((item) => {
                    const enabled = enabledFor(item.eventType);
                    return (
                      <div
                        key={item.eventType}
                        className="flex items-center justify-between gap-4 bg-card px-4 py-3"
                        data-ai-component="notification.settings-row"
                        data-event-type={item.eventType}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                        </div>
                        <Switch
                          checked={enabled}
                          disabled={saving === item.eventType}
                          onCheckedChange={(v) => handleToggle(item, v)}
                          aria-label={item.title}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
