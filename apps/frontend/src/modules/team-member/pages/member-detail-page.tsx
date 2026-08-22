import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { PageShell } from '@/components/ui/page-shell';
import { AvatarPickerField } from '@/components/ui/avatar-picker-field';
import { Mail, Phone, MapPin, Bot, User, Folder, Users, Clock, Copy, Check, Zap, IdCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  useMemberDetail,
  useMemberCard,
  useBindMemberProject,
  useUnbindMemberProject,
  useUpdateMember,
} from '../hooks';
import { MEMBER_THINKING_LEVELS, MEMBER_TRUST_LEVEL_LABELS, type Member } from '@/shared/member/types';
import { MemberAvatar } from '../components/member-avatar';
import { TrustLevelBadge } from '../components/trust-level-badge';
import { MemberToolGrants } from '../components/member-tool-grants';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { data: member, isLoading } = useMemberDetail(memberId);
  const { data: card } = useMemberCard(memberId);
  const bind = useBindMemberProject(memberId!);
  const unbind = useUnbindMemberProject(memberId!);
  const updateMember = useUpdateMember();

  // 档案编辑表单状态（进入编辑 Tab 时从 member 同步初值）
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{
    displayName: string;
    title: string;
    description: string;
    trustLevel: string;
    tagsInput: string;
    avatarUrl: string | null;
    personalPrompt: string;
    thinkingLevel: string;
    costRatePerDay: string;
  }>({
    displayName: '',
    title: '',
    description: '',
    trustLevel: '',
    tagsInput: '',
    avatarUrl: null,
    personalPrompt: '',
    thinkingLevel: '',
    costRatePerDay: '',
  });
  const [copied, setCopied] = useState(false);

  const startEdit = () => {
    if (!member) return;
    setForm({
      displayName: member.displayName ?? '',
      title: member.title ?? '',
      description: member.description ?? '',
      trustLevel: member.trustLevel === null || member.trustLevel === undefined ? '' : String(member.trustLevel),
      tagsInput: (member.tags ?? []).join(', '),
      avatarUrl: member.avatarUrl ?? null,
      personalPrompt: member.personalPrompt ?? '',
      thinkingLevel: member.thinkingLevel ?? '',
      costRatePerDay:
        member.costRatePerDay === null || member.costRatePerDay === undefined
          ? ''
          : String(member.costRatePerDay / 100),
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!memberId || !form.displayName.trim()) return;
    try {
      await updateMember.mutateAsync({
        id: memberId,
        data: {
          displayName: form.displayName.trim(),
          title: form.title || undefined,
          description: form.description || undefined,
          trustLevel: form.trustLevel === '' ? null : Number(form.trustLevel),
          tags: form.tagsInput
            ? form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
            : [],
          avatarUrl: form.avatarUrl ?? undefined,
          ...(member?.type === 'ai_agent'
            ? {
                personalPrompt: form.personalPrompt || undefined,
                thinkingLevel: (form.thinkingLevel || undefined) as Member['thinkingLevel'],
              }
            : {}),
          ...(member?.type === 'human'
            ? {
                costRatePerDay:
                  form.costRatePerDay === '' ? null : Math.round(Number(form.costRatePerDay) * 100),
              }
            : {}),
        },
      });
      toast.success('档案已更新');
      setEditing(false);
    } catch (err) {
      console.error('Update member failed', err);
      toast.error('更新失败');
    }
  };

  const copyShortId = async () => {
    if (!member) return;
    try {
      await navigator.clipboard.writeText(member.shortId);
      setCopied(true);
      toast.success(`已复制短 ID: ${member.shortId}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('复制失败');
    }
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
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      </PageShell>
    );
  }
  if (!member) {
    return (
      <PageShell>
        <div className="text-center py-12 text-muted-foreground">未找到成员</div>
      </PageShell>
    );
  }

  const isAI = member.type === 'ai_agent';
  const boundIds = new Set((card?.projects ?? []).map((p) => p.projectId));
  const availableProjects = (projectsData?.items ?? []).filter((p) => !boundIds.has(p.id));

  return (
    <PageShell>
      <SubPageToolbar
        aiId="team-member.member-detail"
        onBack={() => navigate('/app/members')}
        breadcrumbs={[{ label: '成员管理', to: '/app/members' }, { label: member.displayName }]}
      />
      <PageHeader
        title={member.displayName}
        icon={isAI ? Bot : User}
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <MemberAvatar member={member} size="xl" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold truncate">{member.displayName}</h2>
                  {isAI ? (
                    <Bot className="h-4 w-4 text-accent-purple" />
                  ) : (
                    <User className="h-4 w-4 text-accent-blue" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  @{member.handle}
                  {member.title ? ` · ${member.title}` : ''}
                </p>
                <button
                  type="button"
                  onClick={copyShortId}
                  title="复制短 ID"
                  className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-10 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <IdCard className="h-3 w-3" />
                  {member.shortId}
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <TrustLevelBadge level={member.trustLevel} score={member.trustScore} size="md" />

            {(member.description ?? member.bio) && (
              <p className="text-sm text-muted-foreground">{member.description ?? member.bio}</p>
            )}

            <div className="space-y-1.5 text-xs">
              {member.email && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.timezone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{member.timezone}</span>
                </div>
              )}
              {isAI && member.aiModelConfig && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Bot className="h-3 w-3 text-accent-purple" />
                  <span>
                    {member.aiModelConfig.name} · {member.aiModelConfig.provider}
                  </span>
                </div>
              )}
              {isAI && member.defaultCliProviderId && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>CLI: {member.defaultCliProviderId}</span>
                </div>
              )}
              {isAI && member.thinkingLevel && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>
                    思考强度:{' '}
                    {MEMBER_THINKING_LEVELS.find((l) => l.value === member.thinkingLevel)?.label ??
                      member.thinkingLevel}
                  </span>
                </div>
              )}
              {!isAI && member.costRatePerDay !== null && member.costRatePerDay !== undefined && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>日费率: ¥{(member.costRatePerDay / 100).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {(member.tags ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="text-10">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">待办任务</div>
                <div className="text-lg font-semibold text-accent-yellow">{card?.load.todo ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">进行中</div>
                <div className="text-lg font-semibold text-accent-blue">{card?.load.inProgress ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">已完成</div>
                <div className="text-lg font-semibold text-accent-green">{card?.load.completed ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">最近活跃</div>
                <div className="text-sm font-medium">
                  {card?.lastActiveAt ? new Date(card.lastActiveAt).toLocaleString() : '从未'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="mt-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-3.5 w-3.5 mr-1" /> 档案
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Folder className="h-3.5 w-3.5 mr-1" /> 参与项目
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="h-3.5 w-3.5 mr-1" /> 所属团队
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Clock className="h-3.5 w-3.5 mr-1" /> 活动
          </TabsTrigger>
          {isAI && (
            <TabsTrigger value="grants">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> 工具授权
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">档案信息</CardTitle>
              {!editing && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  编辑
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {!editing ? (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">职务</span>
                      <p>{member.title ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">信任等级</span>
                      <p>
                        {member.trustLevel === null || member.trustLevel === undefined
                          ? '未评估'
                          : MEMBER_TRUST_LEVEL_LABELS[member.trustLevel]}
                        {member.trustScore !== null && member.trustScore !== undefined && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            （信任分 {member.trustScore}）
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">描述</span>
                      <p>{member.description ?? '—'}</p>
                    </div>
                    {isAI && (
                      <div className="col-span-2">
                        <span className="text-xs text-muted-foreground">个人提示词（注入派发与聊天上下文）</span>
                        <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-2 font-mono text-xs">
                          {member.personalPrompt ?? '（未配置）'}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">显示名</label>
                      <Input
                        value={form.displayName}
                        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">职务</label>
                      <Input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">信任等级</label>
                      <select
                        className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                        value={form.trustLevel}
                        onChange={(e) => setForm((f) => ({ ...f, trustLevel: e.target.value }))}
                      >
                        <option value="">未评估</option>
                        {MEMBER_TRUST_LEVEL_LABELS.map((label, level) => (
                          <option key={level} value={level}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">标签（逗号分隔）</label>
                      <Input
                        value={form.tagsInput}
                        onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                        placeholder="frontend, expert"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">描述</label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">头像</label>
                    <AvatarPickerField
                      value={form.avatarUrl}
                      onValueChange={(v) => setForm((f) => ({ ...f, avatarUrl: v }))}
                      memberType={member.type === 'ai_agent' ? 'ai' : 'human'}
                    />
                  </div>
                  {isAI && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">个人提示词</label>
                        <textarea
                          value={form.personalPrompt}
                          onChange={(e) => setForm((f) => ({ ...f, personalPrompt: e.target.value }))}
                          placeholder="注入任务派发与聊天上下文的个人指令…"
                          className="w-full h-28 px-2 py-1.5 rounded-md border border-input bg-background text-sm resize-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium">思考强度</label>
                        <select
                          className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                          value={form.thinkingLevel}
                          onChange={(e) => setForm((f) => ({ ...f, thinkingLevel: e.target.value }))}
                        >
                          <option value="">默认</option>
                          {MEMBER_THINKING_LEVELS.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {!isAI && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">日费率（元/天）</label>
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        value={form.costRatePerDay}
                        onChange={(e) => setForm((f) => ({ ...f, costRatePerDay: e.target.value }))}
                        placeholder="如: 1500"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                      取消
                    </Button>
                    <Button
                      size="sm"
                      disabled={updateMember.isPending || !form.displayName.trim()}
                      onClick={saveEdit}
                    >
                      {updateMember.isPending ? '保存中…' : '保存'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-3 space-y-3">
          <Card>
            <CardContent className="p-3">
              {(card?.projects ?? []).length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  暂未参与任何项目
                </div>
              ) : (
                <ul className="space-y-1">
                  {(card?.projects ?? []).map((p) => (
                    <li
                      key={p.projectId}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30"
                    >
                      <Link
                        to={`/app/projects/${p.projectId}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
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
                          解除
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {availableProjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">绑定到新项目</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <ul className="space-y-1">
                  {availableProjects.slice(0, 10).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
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
                        绑定
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-3">
          <Card>
            <CardContent className="p-3">
              {(card?.teams ?? []).length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  不在任何团队
                </div>
              ) : (
                <ul className="space-y-1">
                  {(card?.teams ?? []).map((t) => (
                    <li
                      key={t.teamId}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30"
                    >
                      <Link
                        to={`/app/teams/${t.teamId}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.color || '#5E6AD2' }}
                        />
                        {t.teamName}
                      </Link>
                      <Badge variant="outline" className="text-10">{t.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-3">
          <Card>
            <CardContent className="p-3">
              {(card?.recentActivities ?? []).length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  暂无活动记录
                </div>
              ) : (
                <ul className="space-y-2">
                  {(card?.recentActivities ?? []).map((a) => (
                    <li
                      key={a.id}
                      className="text-xs text-muted-foreground flex items-center justify-between gap-2"
                    >
                      <span>{a.type}</span>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAI && (
          <TabsContent value="grants" className="mt-3">
            <MemberToolGrants memberId={member.id} />
          </TabsContent>
        )}
      </Tabs>
      </div>
    </PageShell>
  );
}
