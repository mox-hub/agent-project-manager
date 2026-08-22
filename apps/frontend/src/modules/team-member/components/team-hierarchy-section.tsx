import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Workflow as WorkflowIcon } from 'lucide-react';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';
import { listTeamMembers } from '../api/team-member-api';
import { MemberAvatar } from './member-avatar';
import { MemberCardPopover } from './member-card-popover';
import { TrustLevelBadge } from './trust-level-badge';

const ROLE_ORDER = ['owner', 'maintainer', 'member', 'guest'] as const;
const ROLE_LABEL: Record<string, string> = {
  owner: '负责人',
  maintainer: '管理员',
  member: '成员',
  guest: '访客',
};

interface TeamMemberRow {
  id: string;
  teamId: string;
  memberId: string;
  role: string;
  joinedAt: string;
  member?: {
    id: string;
    shortId: string;
    type: string;
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    title: string | null;
    description: string | null;
    trustLevel: number | null;
  };
}

/** 从工作流 definition Json 中尽力提取步骤名 */
function extractSteps(definition: unknown): string[] {
  if (!definition || typeof definition !== 'object') return [];
  const steps = (definition as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => {
      if (typeof s === 'string') return s;
      if (s && typeof s === 'object') {
        const obj = s as { name?: string; stepType?: string; key?: string };
        return obj.name ?? obj.stepType ?? obj.key ?? null;
      }
      return null;
    })
    .filter((s): s is string => Boolean(s));
}

/**
 * 团队层级视图：按团队角色分组的成员卡层级 + 平台工作流只读展示。
 */
export function TeamHierarchySection({ teamId }: { teamId: string }) {
  const { data: members } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: () => listTeamMembers(teamId),
  });
  const { data: workflows } = useQuery({
    queryKey: ['ai-workflows'],
    queryFn: () => aiHubApi.getWorkflows(),
    staleTime: 60 * 1000,
  });

  const groups = useMemo(() => {
    const rows = (members ?? []) as unknown as TeamMemberRow[];
    const map = new Map<string, TeamMemberRow[]>();
    for (const row of rows) {
      const role = ROLE_ORDER.includes(row.role as (typeof ROLE_ORDER)[number])
        ? row.role
        : 'member';
      if (!map.has(role)) map.set(role, []);
      map.get(role)!.push(row);
    }
    return [...map.entries()].sort(
      ([a], [b]) => ROLE_ORDER.indexOf(a as never) - ROLE_ORDER.indexOf(b as never),
    );
  }, [members]);

  return (
    <div className="space-y-3">
      {groups.map(([role, rows]) => (
        <Card key={role}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              {ROLE_LABEL[role] ?? role}
              <Badge variant="secondary" className="text-10">{rows.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-start gap-2.5 rounded-md border border-border p-2.5 transition-colors hover:border-accent-blue/50"
                >
                  <MemberCardPopover
                    memberId={row.memberId}
                    side="right"
                    trigger={
                      <MemberAvatar
                        member={{
                          type: row.member?.type === 'ai_agent' ? 'ai_agent' : 'human',
                          displayName: row.member?.displayName ?? row.memberId,
                          handle: row.member?.handle ?? '',
                          avatarUrl: row.member?.avatarUrl ?? null,
                          isOnline: false,
                        }}
                        size="md"
                      />
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {row.member?.displayName ?? '未知成员'}
                      </span>
                      {row.member?.type === 'ai_agent' ? (
                        <Bot className="h-3.5 w-3.5 shrink-0 text-accent-purple" />
                      ) : (
                        <User className="h-3.5 w-3.5 shrink-0 text-accent-blue" />
                      )}
                    </div>
                    <p className="truncate text-11 text-muted-foreground">
                      @{row.member?.handle || '—'}
                      {row.member?.title ? ` · ${row.member.title}` : ''}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <TrustLevelBadge level={row.member?.trustLevel ?? null} />
                      <span className="font-mono text-10 text-muted-foreground/70">
                        {row.member?.shortId}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {groups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            暂无成员，先在「成员」页签添加
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <WorkflowIcon className="h-4 w-4 text-accent-purple" />
            平台工作流（只读）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(workflows ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              暂无已注册工作流（可在 AI Hub 中定义）
            </p>
          ) : (
            (workflows ?? []).map((w) => {
              const steps = extractSteps((w as unknown as { definition?: unknown }).definition);
              return (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm font-medium">{w.name}</span>
                  <Badge variant="outline" className="text-10">v{w.version}</Badge>
                  {w.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-60">
                      {w.description}
                    </span>
                  )}
                  {steps.length > 0 && (
                    <div className="ml-auto flex flex-wrap items-center gap-1">
                      {steps.map((s, i) => (
                        <Badge
                          key={`${s}-${i}`}
                          variant="secondary"
                          className="bg-accent-purple/10 text-10 text-accent-purple"
                        >
                          {i + 1}. {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
