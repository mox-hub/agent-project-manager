/**
 * 成员详情页 — 按 detail-page 模板重写
 *
 * 骨架：PageShell > SubPageToolbar(返回/面包屑/居中页签/翻页/侧栏开关)
 *      > Body(主区纵向滚动 + RightSidebar)
 * 主区：标题热编辑 > 描述热编辑 > 页签内容（概览/项目/团队/活动/AI 工具授权）
 * 右栏：SidebarButtonGroup(复制短ID/停用) + PropsCard(属性胶囊)
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  CheckCircle2,
  Clock,
  Folder,
  IdCard,
  ListTodo,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User as UserIcon,
  UserX,
  Users,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { RightSidebar, SidebarButton, SidebarButtonGroup } from '@/components/ui/right-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { StatsCard } from '@/components/ui/stats-card';
import {
  AutoSizeTextarea,
  Capsule,
  CapsuleSelect,
  PropertyRow,
  PropsCard,
} from '@/components/ui/property-panel';
import { AvatarPickerField } from '@/components/ui/avatar-picker-field';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { api } from '@/infrastructure/api-client';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useMemberDetail,
  useMemberCard,
  useBindMemberProject,
  useUnbindMemberProject,
  useUpdateMember,
  useDeactivateMember,
  useMembers,
} from '../hooks';
import {
  MEMBER_THINKING_LEVELS,
  MEMBER_TRUST_LEVEL_LABELS,
  type Member,
} from '@/shared/member/types';
import { MemberAvatar } from '../components/member-avatar';
import { MemberToolGrants } from '../components/member-tool-grants';

type DetailTab = 'overview' | 'projects' | 'teams' | 'activities' | 'grants';

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const confirmDialog = useConfirm();
  const { roles } = useAuth();
  const { copyToClipboard } = useCopyToClipboard();

  const { data: member, isLoading } = useMemberDetail(memberId);
  const { data: card } = useMemberCard(memberId);
  const bind = useBindMemberProject(memberId!);
  const unbind = useUnbindMemberProject(memberId!);
  const updateMember = useUpdateMember();
  const deactivate = useDeactivateMember();

  // 翻页器：同集合（全量成员）内上一个/下一个
  const { data: membersData } = useMembers({ limit: 200 });
  const pager = useMemo(() => {
    const list = (membersData?.items ?? []) as Array<{ id: string }>;
    const idx = list.findIndex((m) => m.id === memberId);
    return {
      hasPrev: idx > 0,
      hasNext: idx >= 0 && idx < list.length - 1,
      onPrev: () => idx > 0 && navigate(`/app/members/${list[idx - 1].id}`),
      onNext: () => idx >= 0 && idx < list.length - 1 && navigate(`/app/members/${list[idx + 1].id}`),
      position: idx >= 0 ? `${idx + 1}/${list.length}` : '—',
    };
  }, [membersData, memberId, navigate]);

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [asideHidden, setAsideHidden] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const updateField = async (patch: Partial<Member>) => {
    if (!memberId || !patch) return;
    setMutationError(null);
    try {
      await updateMember.mutateAsync({ id: memberId, data: patch });
    } catch {
      setMutationError(t('memberDetail.updateFailed', '更新失败，请重试'));
    }
  };

  const persistTitle = useDebouncedCallback((value: string) => {
    if (!memberId || !value.trim() || value === member?.displayName) return;
    updateField({ displayName: value.trim() });
  }, 1500);

  const persistDescription = useDebouncedCallback((value: string) => {
    if (!memberId || value === (member?.description ?? '')) return;
    updateField({ description: value });
  }, 1500);

  const handleDeactivate = async () => {
    if (!member) return;
    const ok = await confirmDialog({
      title: t('members.deactivate', '停用成员'),
      description: t('members.deactivateConfirm', {
        defaultValue: '停用成员 {{name}}？',
        name: member.displayName,
      }),
      variant: 'destructive',
    });
    if (ok) deactivate.mutate(member.id);
  };

  const { data: projectsData } = useQuery({
    queryKey: ['projects-for-bind', memberId],
    queryFn: async () => {
      return api.get<{ items: Array<{ id: string; name: string; color: string | null }> }>('/projects', { limit: 100 });
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('common.loading', '加载中…')}
        </div>
      </PageShell>
    );
  }
  if (!member) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('memberDetail.notFound', '未找到成员')}
        </div>
      </PageShell>
    );
  }

  const isAI = member.type === 'ai_agent';
  const isAdmin = roles.some((r) => r.role === 'admin' || r.role === 'maintainer');
  const boundIds = new Set((card?.projects ?? []).map((p) => p.projectId));
  const availableProjects = (projectsData?.items ?? []).filter((p) => !boundIds.has(p.id));

  const tabItems: Array<{ value: DetailTab; label: string }> = [
    { value: 'overview', label: t('memberDetail.tabs.overview', '概览') },
    { value: 'projects', label: t('memberDetail.tabs.projects', '参与项目') },
    { value: 'teams', label: t('memberDetail.tabs.teams', '所属团队') },
    { value: 'activities', label: t('memberDetail.tabs.activities', '活动') },
    ...(isAI
      ? [{ value: 'grants' as DetailTab, label: t('memberDetail.tabs.grants', '工具授权') }]
      : []),
  ];

  const trustOptions = MEMBER_TRUST_LEVEL_LABELS.map((label, level) => ({
    value: String(level),
    label,
  }));

  return (
    <PageShell className="overflow-hidden">
      {/* SubPageToolbar：返回 + 面包屑 + 居中页签 + 翻页器 + 侧栏开关 */}
      <SubPageToolbar
        aiId="team-member.member-detail"
        onBack={() => navigate('/app/members')}
        backLabel={t('common.back', '返回')}
        breadcrumbs={[
          { label: t('members.title', '成员管理'), to: '/app/members' },
          { label: member.displayName },
        ]}
        tabs={{ value: activeTab, onChange: (v) => setActiveTab(v as DetailTab), items: tabItems }}
        actions={<FavoriteToggle label={member.displayName} />}
        pager={pager}
        sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
      />

      {/* Body：主区 + 右栏并列 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 主区（纵向滚动） */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {mutationError && (
            <div className="mx-6 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutationError}
            </div>
          )}

          {/* 标题区：头像 + 热编辑显示名 + 元信息行 */}
          <div className="shrink-0 border-b px-6 pb-3 pt-5">
            <div className="flex items-start gap-3">
              <MemberAvatar member={member} size="lg" />
              <AutoSizeTextarea
                key={`title-${member.id}`}
                defaultValue={member.displayName}
                rows={1}
                placeholder={t('memberDetail.unnamedTitle', '未命名成员')}
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-28 font-bold leading-tight placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">@{member.handle}</span>
              <span className="opacity-50">•</span>
              <button
                type="button"
                onClick={() => copyToClipboard(member.shortId)}
                title={t('memberDetail.copyId', '复制短 ID')}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-10 hover:bg-muted hover:text-foreground"
              >
                <IdCard className="size-3" />
                {member.shortId}
              </button>
              <span className="opacity-50">•</span>
              <span className="inline-flex items-center gap-1">
                {member.status === 'active' && (
                  <span
                    className={`size-1.5 rounded-full ${member.isOnline ? 'bg-accent-green' : 'bg-accent-green/40'}`}
                  />
                )}
                {member.status === 'active'
                  ? member.isOnline
                    ? t('members.status.online', '在线')
                    : t('members.status.active', '活跃')
                  : member.status}
              </span>
              {(member.tags ?? []).length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  {(member.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-10">
                      {tag}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
          </div>

          {/* 描述区：热编辑 */}
          <div className="shrink-0 border-b px-6 pb-4 pt-4">
            <label className="mb-2 block text-10 font-semibold uppercase tracking-wider text-muted-foreground">
              {t('memberDetail.description', '描述')}
            </label>
            <AutoSizeTextarea
              rows={2}
              defaultValue={member.description ?? member.bio ?? ''}
              onChange={(e) => persistDescription(e.target.value)}
              placeholder={t('memberDetail.addDescription', '添加描述…')}
              className="w-full text-sm leading-relaxed placeholder:text-muted-foreground/40"
            />
          </div>

          {/* 页签内容 */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
            {activeTab === 'overview' && (
              <>
                <StatsCard
                  columns={4}
                  items={[
                    { key: 'todo', value: card?.load.todo ?? 0, label: t('memberDetail.stats.todo', '待办任务'), icon: ListTodo, iconColorClass: 'text-accent-yellow' },
                    { key: 'inProgress', value: card?.load.inProgress ?? 0, label: t('memberDetail.stats.inProgress', '进行中'), icon: LoaderCircle, iconColorClass: 'text-accent-blue' },
                    { key: 'completed', value: card?.load.completed ?? 0, label: t('memberDetail.stats.completed', '已完成'), icon: CheckCircle2, iconColorClass: 'text-accent-green' },
                    {
                      key: 'lastActive',
                      value: member.lastActiveAt
                        ? new Date(member.lastActiveAt).toLocaleString()
                        : t('memberDetail.stats.never', '从未'),
                      label: t('memberDetail.stats.lastActive', '最近活跃'),
                      icon: Clock,
                    },
                  ]}
                />

                {isAI && (
                  <SectionCard
                    title={t('memberDetail.personalPrompt', '个人提示词')}
                    description={t('memberDetail.personalPromptDesc', '注入任务派发与聊天上下文的个人指令')}
                  >
                    <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 font-mono text-xs">
                      {member.personalPrompt ?? t('memberDetail.personalPromptEmpty', '（未配置）')}
                    </pre>
                  </SectionCard>
                )}

                {!isAI && member.costRatePerDay !== null && member.costRatePerDay !== undefined && (
                  <SectionCard title={t('memberDetail.costRate', '日费率')}>
                    <p className="text-sm">
                      ¥{(member.costRatePerDay / 100).toLocaleString()}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {t('memberDetail.costRateUnit', '/ 天')}
                      </span>
                    </p>
                  </SectionCard>
                )}
              </>
            )}

            {activeTab === 'projects' && (
              <>
                <SectionCard title={t('memberDetail.boundProjects', '已参与项目')}>
                  {(card?.projects ?? []).length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {t('memberDetail.noProjects', '暂未参与任何项目')}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {(card?.projects ?? []).map((p) => (
                        <li
                          key={p.projectId}
                          className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/30"
                        >
                          <Link
                            to={`/app/projects/${p.projectId}`}
                            className="flex items-center gap-2 text-sm hover:underline"
                          >
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: p.color || '#5E6AD2' }}
                            />
                            {p.projectName}
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-10">{p.role}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-10 text-accent-red"
                              onClick={() => unbind.mutate(p.projectId)}
                            >
                              {t('memberDetail.unbind', '解除')}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                {availableProjects.length > 0 && (
                  <SectionCard title={t('memberDetail.bindNewProject', '绑定到新项目')}>
                    <ul className="space-y-1">
                      {availableProjects.slice(0, 10).map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: p.color || '#5E6AD2' }}
                            />
                            {p.name}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-10"
                            onClick={() => bind.mutate({ projectId: p.id, role: 'member' })}
                          >
                            {t('memberDetail.bind', '绑定')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
              </>
            )}

            {activeTab === 'teams' && (
              <SectionCard title={t('memberDetail.memberTeams', '所属团队')}>
                {(card?.teams ?? []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('memberDetail.noTeams', '不在任何团队')}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {(card?.teams ?? []).map((tm) => (
                      <li
                        key={tm.teamId}
                        className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/30"
                      >
                        <Link
                          to={`/app/teams/${tm.teamId}`}
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: tm.color || '#5E6AD2' }}
                          />
                          {tm.teamName}
                        </Link>
                        <Badge variant="outline" className="text-10">{tm.role}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'activities' && (
              <SectionCard title={t('memberDetail.recentActivities', '活动记录')}>
                {(card?.recentActivities ?? []).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('memberDetail.noActivities', '暂无活动记录')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(card?.recentActivities ?? []).map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                      >
                        <span>{a.type}</span>
                        <span>{new Date(a.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}

            {activeTab === 'grants' && isAI && <MemberToolGrants memberId={member.id} />}
          </div>
        </div>

        {/* 右侧栏（320px，可收起） */}
        <RightSidebar hidden={asideHidden} width={320}>
          <SidebarButtonGroup className="px-1">
            <SidebarButton
              icon={IdCard}
              label={t('memberDetail.copyId', '复制短 ID')}
              onClick={() => copyToClipboard(member.shortId)}
            />
            {isAdmin && member.status === 'active' && (
              <SidebarButton
                icon={UserX}
                label={t('members.deactivate', '停用')}
                onClick={handleDeactivate}
                className="text-destructive hover:text-destructive"
              />
            )}
          </SidebarButtonGroup>

          <PropsCard
            title={t('memberDetail.properties', '属性')}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow icon={isAI ? <Bot className="size-3.5" /> : <UserIcon className="size-3.5" />} label={t('memberDetail.fields.type', '类型')}>
              <Capsule active>
                {isAI ? t('members.filter.ai', 'AI') : t('members.filter.human', '人类')}
              </Capsule>
            </PropertyRow>
            <PropertyRow icon={<Sparkles className="size-3.5" />} label={t('memberDetail.fields.trustLevel', '信任等级')}>
              <CapsuleSelect
                value={member.trustLevel === null || member.trustLevel === undefined ? '' : String(member.trustLevel)}
                options={trustOptions}
                placeholder={t('memberDetail.fields.unrated', '未评估')}
                onChange={(v) => updateField({ trustLevel: v === '' ? null : Number(v) })}
              />
            </PropertyRow>
            {member.title && (
              <PropertyRow icon={<UserIcon className="size-3.5" />} label={t('memberDetail.fields.title', '职务')}>
                <span className="truncate text-xs text-muted-foreground">{member.title}</span>
              </PropertyRow>
            )}
            {member.email && (
              <PropertyRow icon={<Mail className="size-3.5" />} label={t('memberDetail.fields.email', '邮箱')}>
                <span className="truncate text-xs text-muted-foreground">{member.email}</span>
              </PropertyRow>
            )}
            {member.phone && (
              <PropertyRow icon={<Phone className="size-3.5" />} label={t('memberDetail.fields.phone', '电话')}>
                <span className="truncate text-xs text-muted-foreground">{member.phone}</span>
              </PropertyRow>
            )}
            {member.timezone && (
              <PropertyRow icon={<MapPin className="size-3.5" />} label={t('memberDetail.fields.timezone', '时区')}>
                <span className="truncate text-xs text-muted-foreground">{member.timezone}</span>
              </PropertyRow>
            )}
            {isAI && member.aiModelConfig && (
              <PropertyRow icon={<Bot className="size-3.5" />} label={t('memberDetail.fields.model', '模型配置')}>
                <span className="truncate text-xs text-muted-foreground">
                  {member.aiModelConfig.name} · {member.aiModelConfig.provider}
                </span>
              </PropertyRow>
            )}
            {isAI && (
              <PropertyRow icon={<Sparkles className="size-3.5" />} label={t('memberDetail.fields.thinkingLevel', '思考强度')}>
                <CapsuleSelect
                  value={member.thinkingLevel ?? ''}
                  options={MEMBER_THINKING_LEVELS.map((l) => ({ value: l.value, label: l.label }))}
                  placeholder={t('memberDetail.fields.default', '默认')}
                  onChange={(v) => updateField({ thinkingLevel: (v || null) as Member['thinkingLevel'] })}
                />
              </PropertyRow>
            )}
            {!isAI && member.costRatePerDay !== null && member.costRatePerDay !== undefined && (
              <PropertyRow icon={<Clock className="size-3.5" />} label={t('memberDetail.costRate', '日费率')}>
                <span className="text-xs text-muted-foreground">
                  ¥{(member.costRatePerDay / 100).toLocaleString()}
                </span>
              </PropertyRow>
            )}
            <PropertyRow icon={<UserIcon className="size-3.5" />} label={t('memberDetail.fields.avatar', '头像')}>
              <AvatarPickerField
                value={member.avatarUrl}
                onValueChange={(v) => updateField({ avatarUrl: v ?? undefined })}
                memberType={isAI ? 'ai' : 'human'}
              />
            </PropertyRow>
          </PropsCard>

          {(card?.projects ?? []).length > 0 && (
            <PropsCard
              title={t('memberDetail.boundProjects', '参与项目')}
              collapsed={propsCollapsed}
              onToggleCollapse={() => setPropsCollapsed((v) => !v)}
            >
              {(card?.projects ?? []).map((p) => (
                <PropertyRow key={p.projectId} icon={<Folder className="size-3.5" />} label={p.projectName}>
                  <Badge variant="outline" className="text-10">{p.role}</Badge>
                </PropertyRow>
              ))}
            </PropsCard>
          )}

          {(card?.teams ?? []).length > 0 && (
            <PropsCard
              title={t('memberDetail.memberTeams', '所属团队')}
              collapsed={propsCollapsed}
              onToggleCollapse={() => setPropsCollapsed((v) => !v)}
            >
              {(card?.teams ?? []).map((tm) => (
                <PropertyRow key={tm.teamId} icon={<Users className="size-3.5" />} label={tm.teamName}>
                  <Badge variant="outline" className="text-10">{tm.role}</Badge>
                </PropertyRow>
              ))}
            </PropsCard>
          )}
        </RightSidebar>
      </div>
    </PageShell>
  );
}
