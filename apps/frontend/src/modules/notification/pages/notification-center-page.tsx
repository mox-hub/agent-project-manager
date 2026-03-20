import { PageShell } from "@/components/ui/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { AttentionRail } from "@/components/ui/attention-rail";
import { Card } from "@/components/ui/card";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { NotificationCenter } from "../components/notification-center";

export function NotificationCenterPage() {
  return (
    <PageShell className="overflow-auto" aiPage={CORE_AI_PAGE_IDS.notificationCenter}>
      <PageHeader
        aiId="notification.notification-center"
        title="Notifications"
        description="统一处理系统提醒、项目动态与需要你快速响应的事项。"
      />
      <div className="mx-auto grid w-full max-w-[1280px] gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card
          className="overflow-hidden rounded-xl border-content-border bg-content-bg motion-enter"
          data-ai-component="notification.notification-center.primary-content"
          data-ai-role="content"
        >
          <NotificationCenter />
        </Card>

        <AttentionRail
          aiPrefix="notification.notification-center"
          items={[
            {
              id: 'dashboard',
              title: '回到 Dashboard',
              description: '查看汇总指标与风险状态',
              to: '/app/projects/dashboard',
            },
            {
              id: 'projects',
              title: '进入项目工作台',
              description: '直接处理通知对应的项目事项',
              to: '/app/projects',
            },
          ]}
        />
      </div>
    </PageShell>
  );
}

