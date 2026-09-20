import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FileSearch, GitCompareArrows, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import type {
  ContractAlignmentReport,
  ContractBinding,
  ContractFileTypeOption,
  SeedContractResult,
} from '../api/contract-api';
import {
  useCheckContractAlignment,
  useContractBindings,
  useSeedContractFiles,
  useSetContractSyncMode,
} from '../hooks/use-contract';

/** 可种生的标准契约文件类型（其余类型随四期扩展） */
const SEEDABLE_FILE_TYPES = ['agents', 'claude_alias', 'changelog'] as const;
const SYNC_MODES = ['managed', 'synced', 'detached'] as const;

const syncModeTone: Record<string, string> = {
  managed: 'text-accent-blue',
  synced: 'text-accent-green',
  detached: 'text-content-muted',
};

export interface ContractBindingsPanelProps {
  projectId: string;
  /** 工作区未绑定时是否内嵌引导（init 页传 true 已自带上方的绑定卡，无需重复） */
  hintWorkspace?: boolean;
}

/**
 * 契约绑定面板：标准契约文件的绑定状态 / 种生 / 对齐检查 / 三态切换。
 * 由项目 init 页与设置页「契约文件」页签共用。
 */
export function ContractBindingsPanel({
  projectId,
  hintWorkspace = true,
}: ContractBindingsPanelProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useContractBindings(projectId);
  const seedFiles = useSeedContractFiles(projectId);
  const checkAlignment = useCheckContractAlignment(projectId);
  const setSyncMode = useSetContractSyncMode(projectId);
  const [lastSeed, setLastSeed] = useState<SeedContractResult | null>(null);
  const [lastReports, setLastReports] = useState<ContractAlignmentReport[] | null>(
    null,
  );

  const bindings: ContractBinding[] = data?.bindings ?? [];
  const hasWorkspace = data?.workspaceRoot != null;

  const handleSeed = async (
    input?: { fileTypes?: ContractFileTypeOption[]; formatOnly?: boolean },
  ) => {
    const result = await seedFiles.mutateAsync(input);
    setLastSeed(result);
  };

  const handleCheck = async (fileType?: ContractFileTypeOption) => {
    const reports = await checkAlignment.mutateAsync(fileType);
    setLastReports(reports);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-md bg-content-bg-secondary" />
        ))}
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
      data-ai-component="contract.bindings-panel"
      data-ai-role="content"
    >
      {!hasWorkspace && hintWorkspace && (
        <Alert>
          <AlertTitle>{t('contract.noWorkspace.title')}</AlertTitle>
          <AlertDescription>{t('contract.noWorkspace.desc')}</AlertDescription>
        </Alert>
      )}

      {hasWorkspace && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="font-mono">{data?.workspaceRoot}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('contract.list.title')}</h3>
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleCheck()}
            disabled={checkAlignment.isPending || bindings.length === 0}
            data-ai-component="contract.bindings-panel.check-all"
            data-ai-action="contract.bindings-panel.check-all.click"
            data-ai-role="action"
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            {t('contract.action.checkAll')}
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleSeed({ formatOnly: true })}
            disabled={seedFiles.isPending || !hasWorkspace}
            title={t('contract.action.adoptAllTitle')}
            data-ai-component="contract.bindings-panel.adopt"
            data-ai-action="contract.bindings-panel.adopt.click"
            data-ai-role="action"
          >
            <FileSearch className="h-3.5 w-3.5" />
            {t('contract.action.adoptAll')}
          </Button>
          <Button
            size="xs"
            onClick={() => handleSeed()}
            disabled={seedFiles.isPending || !hasWorkspace}
            data-ai-component="contract.bindings-panel.seed-all"
            data-ai-action="contract.bindings-panel.seed-all.click"
            data-ai-role="action"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('contract.action.seedAll')}
          </Button>
        </div>
      </div>

      {bindings.length === 0 ? (
        <EmptyState
          title={t('contract.empty.title')}
          description={t('contract.empty.desc')}
        />
      ) : (
        <div className="space-y-1.5">
          {bindings.map((binding) => {
            const conflicted = binding.conflictState === 'conflicted';
            const seedable = (SEEDABLE_FILE_TYPES as readonly string[]).includes(
              binding.fileType,
            );
            return (
              <div
                key={binding.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                data-ai-component="contract.bindings-panel.row"
                data-ai-role="item"
                data-ai-entity={`contract-binding:${binding.id}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{t(`contract.fileType.${binding.fileType}`)}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-10', syncModeTone[binding.syncMode])}
                    >
                      {t(`contract.syncMode.${binding.syncMode}`)}
                    </Badge>
                    {conflicted && (
                      <Badge variant="destructive" className="text-10">
                        {t('contract.state.conflicted')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {binding.filePath}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {conflicted &&
                    (binding.syncMode === 'synced' ? (
                      <span className="text-xs text-accent-yellow">
                        {t('contract.state.fileChanged')}
                      </span>
                    ) : (
                      <Button size="xs" variant="ghost" asChild>
                        <Link to="/app/decisions">
                          {t('contract.action.viewProposal')}
                        </Link>
                      </Button>
                    ))}
                  {!conflicted &&
                    binding.syncMode !== 'detached' &&
                    seedable && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleCheck(binding.fileType)}
                        disabled={checkAlignment.isPending}
                        data-ai-action={`contract.bindings-panel.check.${binding.fileType}.click`}
                        data-ai-role="action"
                      >
                        {t('contract.action.check')}
                      </Button>
                    )}
                  {seedable && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        handleSeed({ fileTypes: [binding.fileType] })
                      }
                      disabled={seedFiles.isPending || !hasWorkspace}
                      data-ai-action={`contract.bindings-panel.seed.${binding.fileType}.click`}
                      data-ai-role="action"
                    >
                      {t('contract.action.seed')}
                    </Button>
                  )}
                  <NativeSelect
                    value={binding.syncMode}
                    onChange={(event) =>
                      setSyncMode.mutate({
                        fileType: binding.fileType,
                        syncMode: event.target.value,
                      })
                    }
                    className="h-7 w-24 text-xs"
                    data-ai-action={`contract.bindings-panel.sync-mode.${binding.fileType}.change`}
                    data-ai-role="select"
                  >
                    {SYNC_MODES.map((mode) => (
                      <NativeSelectOption key={mode} value={mode}>
                        {t(`contract.syncMode.${mode}`)}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastSeed && (
        <div className="space-y-1 rounded-md bg-content-bg-secondary px-3 py-2">
          <p className="text-xs font-medium">{t('contract.result.seedTitle')}</p>
          {lastSeed.files.map((file) => (
            <div key={file.path} className="flex items-center gap-2 text-xs">
              <span className="font-mono">{file.path}</span>
              <Badge
                variant={file.action === 'created' || file.action === 'updated' ? 'secondary' : 'outline'}
                className="text-10"
              >
                {t(`contract.seedAction.${file.action}`)}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {lastReports && lastReports.length > 0 && (
        <div className="space-y-1 rounded-md bg-content-bg-secondary px-3 py-2">
          <p className="text-xs font-medium">{t('contract.result.checkTitle')}</p>
          {lastReports.map((report) => (
            <div key={report.fileType} className="flex items-center gap-2 text-xs">
              <span>{t(`contract.fileType.${report.fileType}`)}</span>
              <Badge
                variant={report.state === 'aligned' ? 'secondary' : report.state === 'conflicted' ? 'destructive' : 'outline'}
                className="text-10"
              >
                {t(`contract.checkState.${report.state}`)}
              </Badge>
              {report.state === 'conflicted' && (
                <Link
                  to="/app/decisions"
                  className="text-xs text-accent-blue hover:underline"
                >
                  {t('contract.action.viewProposal')}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
