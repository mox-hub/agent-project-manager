import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  FolderOpen,
  FolderPlus,
  Info,
  KeyRound,
  Lightbulb,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/toast';
import { AuthGuard } from '@/modules/auth/components/auth-guard';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  getCurrentWorkspaceId,
  switchWorkspace,
  workspaceApi,
  type WorkspaceRecord,
} from '../api/workspace-api';

const TOTAL_STEPS = 3;

/** 绝对路径轻校验：Windows 盘符（C:\ 或 C:/）或 POSIX 根路径 */
function isAbsolutePath(p: string) {
  return /^[a-zA-Z]:[\\/].+/.test(p) || /^\/.+/.test(p);
}

/**
 * 创建工作区（独立全屏路由，同设置页布局）：
 * 左侧工作区说明（是什么 / 适用场景 / 注意事项），右侧三步向导（名称 → 存储位置 → 确认创建），
 * 成功后展示完成卡片并可一键切换（新库初始账号 admin / password123）。
 */
export default function NewWorkspacePage() {
  return (
    <AuthGuard>
      <NewWorkspaceContent />
    </AuthGuard>
  );
}

function NewWorkspaceContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<WorkspaceRecord | null>(null);

  const { roles } = useAuth();
  const isAdmin = roles.some(
    (r) => r.scopeType === 'global' && r.role === 'admin',
  );

  // 当前工作区名称（aside 展示）
  const currentWorkspaceId = getCurrentWorkspaceId();
  const { data: workspacesRes } = useQuery({
    queryKey: ['workspaces-list'],
    queryFn: () => workspaceApi.list(),
    staleTime: 60 * 1000,
  });
  const currentWorkspace = (workspacesRes?.workspaces ?? []).find(
    (w) => w.id === currentWorkspaceId,
  );

  // 记录进入页面时的历史索引，返回时按差值一次性跳回（同设置页）
  const entryHistoryIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (entryHistoryIdxRef.current === null) {
      entryHistoryIdxRef.current =
        (window.history.state as { idx?: number } | null)?.idx ?? 0;
    }
  }, []);

  const handleBackToApp = () => {
    const currentIdx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    const entryIdx = entryHistoryIdxRef.current ?? 0;
    if (entryIdx > 0 && currentIdx >= entryIdx) {
      navigate(-Math.max(1, currentIdx - entryIdx));
    } else {
      navigate('/app/projects');
    }
  };

  const nameValid = name.trim().length >= 1 && name.trim().length <= 40;
  const pathValid = isAbsolutePath(pathInput.trim());
  const canNext = step === 0 ? nameValid : step === 1 ? pathValid : true;

  const handleNext = () => {
    setError(null);
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const record = await workspaceApi.create({
        name: name.trim(),
        path: pathInput.trim(),
      });
      toast.success(
        t('workspace.createSuccess', {
          defaultValue: '工作区「{{name}}」已创建',
          name: record.name,
        }),
      );
      setCreated(record);
    } catch (err) {
      setError(
        (err instanceof Error && err.message) ||
          t('workspace.createFailed', '创建失败，请检查路径与权限'),
      );
    } finally {
      setCreating(false);
    }
  };

  const stepTitles = [
    t('workspace.step1Title', '基本信息'),
    t('workspace.step2Title', '存储位置'),
    t('workspace.step3Title', '确认创建'),
  ];

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-background text-foreground"
      data-ai-page="workspace.new"
      data-ai-component="workspace.new"
      data-ai-role="page"
    >
      {/* 左侧：返回 + 工作区说明 */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/20">
        <div className="shrink-0 border-b border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToApp}
            className="w-full justify-start gap-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            data-ai-component="workspace.new.back"
            data-ai-action="workspace.new.back.click"
          >
            <ArrowLeft size={16} />
            {t('workspace.backToApp', '返回应用')}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4" data-ai-component="workspace.new.guide">
          {/* 当前工作区 */}
          <div className="mb-5 rounded-lg border border-border bg-background p-3">
            <p className="text-11 font-semibold uppercase tracking-wider text-muted-foreground/60">
              {t('workspace.currentWorkspace', '当前工作区')}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <Database size={14} className="shrink-0 text-accent-blue" />
              <span className="truncate text-sm font-medium">
                {currentWorkspace?.name ?? 'Default'}
              </span>
              <Badge variant="outline" className="ml-auto shrink-0">
                {t('workspace.currentBadge', '当前')}
              </Badge>
            </div>
          </div>

          {/* 什么是工作区 */}
          <section className="mb-5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Info size={14} className="text-accent-blue" />
              <p className="text-xs font-semibold">
                {t('workspace.whatIsTitle', '什么是工作区')}
              </p>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                {t(
                  'workspace.whatIsDesc',
                  '工作区拥有完全独立的数据库：成员、账号、项目、任务等数据互不可见、互不影响。',
                )}
              </p>
              <p>
                {t(
                  'workspace.whatIsPoint2',
                  '切换工作区后需要重新登录（账号与登录态按工作区隔离）。',
                )}
              </p>
            </div>
          </section>

          {/* 适用场景 */}
          <section className="mb-5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Lightbulb size={14} className="text-accent-yellow" />
              <p className="text-xs font-semibold">
                {t('workspace.scenariosTitle', '适用场景')}
              </p>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li>· {t('workspace.scenario1', '按客户隔离：为不同客户建立独立交付空间')}</li>
              <li>· {t('workspace.scenario2', '按产品线隔离：多产品各自管理项目与成员')}</li>
              <li>· {t('workspace.scenario3', '按环境隔离：测试 / 演示 / 生产数据分开')}</li>
            </ul>
          </section>

          {/* 注意事项 */}
          <section>
            <div className="mb-1.5 flex items-center gap-1.5">
              <ListChecks size={14} className="text-accent-red" />
              <p className="text-xs font-semibold">
                {t('workspace.notesTitle', '注意事项')}
              </p>
            </div>
            <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              <li>· {t('workspace.note1', '仅管理员可创建工作区')}</li>
              <li>· {t('workspace.note2', '存储目录须为空（或不存在），路径必须为绝对路径')}</li>
              <li>
                · {t(
                  'workspace.note3',
                  '新工作区从模板库初始化，初始账号为 admin / password123',
                )}
              </li>
              <li>
                · {t(
                  'workspace.note4',
                  '创建过程会写入 data / uploads / logs 子目录与独立数据库文件',
                )}
              </li>
            </ul>
          </section>
        </div>
      </aside>

      {/* 右侧：三步向导 / 完成页 */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="mx-auto max-w-2xl px-6 py-10">
            <div className="mb-2 flex items-center gap-2">
              <FolderPlus size={18} className="text-accent-blue" />
              <h1 className="text-lg font-semibold">
                {t('workspace.title', '新建工作区')}
              </h1>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              {t(
                'workspace.pageDesc',
                '按步骤完成信息填写，系统将初始化一个完全隔离的独立工作区。',
              )}
            </p>

            {!isAdmin ? (
              <Alert className="mb-4">
                <ShieldCheck />
                <AlertTitle>{t('workspace.noPermissionTitle', '需要管理员权限')}</AlertTitle>
                <AlertDescription>
                  {t(
                    'workspace.noPermissionDesc',
                    '当前账号不是管理员，无法创建工作区；可请联系管理员创建。',
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            {created ? (
              <CreatedCard
                record={created}
                onBack={() => handleBackToApp()}
              />
            ) : (
              <div>
                {/* 步骤指示：步骤 n / N + 进度条（对齐 onboarding 向导形态） */}
                <div className="mb-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-sm font-medium">{stepTitles[step]}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('workspace.stepIndicator', {
                        defaultValue: '步骤 {{current}} / {{total}}',
                        current: step + 1,
                        total: TOTAL_STEPS,
                      })}
                    </p>
                  </div>
                  <Progress
                    value={((step + 1) / TOTAL_STEPS) * 100}
                    className="h-1"
                  />
                </div>

                {step === 0 ? (
                  <Card className="border-border shadow-none">
                    <CardHeader>
                      <CardTitle>{t('workspace.step1Title', '基本信息')}</CardTitle>
                      <CardDescription>
                        {t('workspace.step1Desc', '为工作区命名，便于在切换列表中识别。')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Field>
                        <FieldLabel htmlFor="workspace-name">
                          {t('workspace.nameLabel', '工作区名称')}
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            id="workspace-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('workspace.namePlaceholder', '如：公司A / 个人项目')}
                            maxLength={40}
                            autoFocus
                          />
                          <FieldDescription>
                            {t('workspace.nameHint', '1-40 个字符')}
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </CardContent>
                  </Card>
                ) : step === 1 ? (
                  <Card className="border-border shadow-none">
                    <CardHeader>
                      <CardTitle>{t('workspace.step2Title', '存储位置')}</CardTitle>
                      <CardDescription>
                        {t(
                          'workspace.step2Desc',
                          '指定工作区数据目录，系统将在此初始化独立数据库。',
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Field>
                        <FieldLabel htmlFor="workspace-path">
                          {t('workspace.pathLabel', '数据目录（绝对路径）')}
                        </FieldLabel>
                        <FieldContent>
                          <div className="flex items-center gap-2">
                            <FolderOpen size={14} className="shrink-0 text-muted-foreground" />
                            <Input
                              id="workspace-path"
                              value={pathInput}
                              onChange={(e) => setPathInput(e.target.value)}
                              placeholder={t('workspace.pathPlaceholder', '如：D:\\apm-workspaces\\company-a')}
                              className="font-mono text-xs"
                              autoFocus
                            />
                          </div>
                          {pathInput && !pathValid ? (
                            <p className="text-11 text-accent-red">
                              {t(
                                'workspace.pathInvalid',
                                '请输入绝对路径（如 C:\\dir 或 /home/user/dir）',
                              )}
                            </p>
                          ) : (
                            <FieldDescription>
                              {t(
                                'workspace.pathHint',
                                '目录须为空或不存在；系统将创建 data/uploads/logs 子目录并复制模板数据库。',
                              )}
                            </FieldDescription>
                          )}
                        </FieldContent>
                      </Field>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border shadow-none">
                    <CardHeader>
                      <CardTitle>{t('workspace.step3Title', '确认创建')}</CardTitle>
                      <CardDescription>
                        {t('workspace.step3Desc', '请核对以下信息，创建后立即生效。')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">
                            {t('workspace.summaryName', '名称')}
                          </span>
                          <span className="font-medium">{name.trim()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-muted-foreground">
                            {t('workspace.summaryPath', '存储位置')}
                          </span>
                          <span className="truncate font-mono text-xs" title={pathInput.trim()}>
                            {pathInput.trim()}
                          </span>
                        </div>
                      </div>

                      <Alert>
                        <KeyRound />
                        <AlertTitle>
                          {t('workspace.afterCreateTitle', '创建后须知')}
                        </AlertTitle>
                        <AlertDescription>
                          {t(
                            'workspace.afterCreateDesc',
                            '新工作区初始账号为 admin / password123，首次登录后请立即修改密码；切换工作区需重新登录。',
                          )}
                        </AlertDescription>
                      </Alert>

                      {error ? (
                        <div className="rounded-md bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
                          {error}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )}

                {/* 步骤导航 */}
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0 || creating}
                  >
                    <ArrowLeft size={14} />
                    {t('workspace.prevStep', '上一步')}
                  </Button>
                  {step < TOTAL_STEPS - 1 ? (
                    <Button size="sm" onClick={handleNext} disabled={!canNext}>
                      {t('workspace.nextStep', '下一步')}
                      <ArrowRight size={14} />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleCreate}
                      disabled={creating || !nameValid || !pathValid || !isAdmin}
                    >
                      {creating
                        ? t('workspace.creating', '初始化中…')
                        : t('workspace.createButton', '创建工作区')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

/** 完成卡片：工作区信息 + 切换/停留 */
function CreatedCard({
  record,
  onBack,
}: {
  record: WorkspaceRecord;
  onBack: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="border-border shadow-none" data-ai-component="workspace.new.done">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-accent-green" />
          {t('workspace.doneTitle', '创建完成')}
        </CardTitle>
        <CardDescription>
          {t('workspace.doneDesc', '工作区已初始化完成，可立即切换过去登录使用。')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {t('workspace.summaryName', '名称')}
            </span>
            <span className="font-medium">{record.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {t('workspace.fieldId', '工作区 ID')}
            </span>
            <span className="font-mono text-xs">{record.id}</span>
          </div>
          {record.path ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {t('workspace.summaryPath', '存储位置')}
              </span>
              <span className="truncate font-mono text-xs" title={record.path}>
                {record.path}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {t('workspace.initialAccount', '初始账号')}
            </span>
            <span className="font-mono text-xs">admin / password123</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            {t('workspace.stayHere', '留在当前工作区')}
          </Button>
          <Button size="sm" onClick={() => switchWorkspace(record.id)}>
            {t('workspace.switchNow', '切换到新工作区并登录')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
