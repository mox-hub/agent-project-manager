/**
 * 引导「连接仓库」步骤（2026-10-04 实机验收反馈迭代）。
 *
 * 历史版本是纯静态提示（2026-09-12 诚实化改造：当时无单一契约端点，不做假表单）。
 * 现接真实绑定：创建项目步产出的 projectId 传导进来后，复用 git 模块
 * BindRepositoryDialog（表单/校验/落库全在既有链路），绑定结果即时回显；
 * 未建项目（跳过）时退回静态指引。仍可跳过——仓库可进 APM 后在项目内随时绑定。
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, GitBranch, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BindRepositoryDialog } from '@/modules/git/components/bind-repository-dialog';
import { gitApi } from '@/modules/git/api/git-api';
import { ChevronRight } from 'lucide-react';

interface StepContentProps {
  onNext: () => void;
  onSkip: () => void;
  /** 创建项目步落库的项目 id（跳过创建时为空 → 退回静态指引） */
  projectId?: string;
}

export function ConnectRepositoryStep({ onNext, onSkip, projectId }: StepContentProps) {
  const { t } = useTranslation();
  const [bindOpen, setBindOpen] = useState(false);
  const reposQuery = useQuery({
    queryKey: ['git', 'repos', 'onboarding', projectId ?? 'none'],
    queryFn: () => gitApi.getRepositories({ projectId }),
    enabled: Boolean(projectId),
  });
  const repos = reposQuery.data ?? [];

  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <GitBranch className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">{t('onboarding.connectRepository.heading')}</DialogTitle>
        <DialogDescription className="text-center">
          {t('onboarding.connectRepository.description')}
        </DialogDescription>
      </DialogHeader>

      {projectId ? (
        <div className="space-y-3">
          {repos.length > 0 ? (
            <div className="space-y-1.5">
              {repos.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-green" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{repo.name}</span>
                  {repo.remoteUrl ? (
                    <span className="min-w-0 flex-1 truncate font-mono text-3xs text-muted-foreground" title={repo.remoteUrl}>
                      {repo.remoteUrl}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
              {t('onboarding.connectRepository.bindHint')}
            </div>
          )}

          <Button type="button" variant="outline" onClick={() => setBindOpen(true)} className="w-full">
            <Link2 className="mr-1 h-4 w-4" />
            {repos.length > 0
              ? t('onboarding.connectRepository.bindAnother')
              : t('onboarding.connectRepository.bind')}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
          {t('onboarding.connectRepository.noProjectHint')}
        </div>
      )}

      {projectId ? (
        <BindRepositoryDialog
          open={bindOpen}
          onOpenChange={setBindOpen}
          projectId={projectId}
          onSuccess={() => {
            void reposQuery.refetch();
          }}
        />
      ) : null}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onSkip}>
          {t('onboarding.common.skip')}
        </Button>
        <Button type="button" onClick={onNext}>
          {t('onboarding.common.next')}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );
}
