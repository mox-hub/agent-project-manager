/**
 * GithubIntegrationSection - 设置页「GitHub 集成」子页
 * @description 由 github 模块的 GithubIntegrationPage 迁移而来（原路由 /app/integrations/github，2026-08-19 迁入设置页）
 * - 列出 GitHub integration 配置
 * - 显示 PR 状态、设置连接
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@/components/ui/page-shell';
import { useIntegrations } from '@/modules/integration/hooks/use-integrations';
import { GithubPanel } from '@/modules/github/components/github-panel';
import { GithubSetupCard } from '@/modules/github/components/github-setup-card';
import { GithubConfigForm } from '@/modules/github/components/github-config-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Github, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function GithubIntegrationSection() {
  const { t } = useTranslation();
  const { data: integrationsResp } = useIntegrations();
  const integrations = integrationsResp?.data ?? [];
  const githubInts = integrations.filter((i) => i.provider === 'github');
  const firstId = githubInts[0]?.id;
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <PageShell
      variant="standard"
      title={t('settings.integration.githubIntegration.title')}
      icon={Github}
      actions={
        <Button size="sm"  onClick={() => setConnectOpen(true)}>
          <Github className="mr-1 h-3.5 w-3.5" />
          {t('settings.integration.githubIntegration.connect')}
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {githubInts.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle size="base" className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-accent-yellow" />
                  {t('settings.integration.githubIntegration.emptyTitle')}
                </CardTitle>
                <CardDescription >
                  <span className="block">
                    {t('settings.integration.githubIntegration.emptyDesc')}
                  </span>
                  <Button size="sm" onClick={() => setConnectOpen(true)}>
                    <Github className="mr-1 h-3.5 w-3.5" />
                    {t('settings.integration.githubIntegration.emptyCta')}
                  </Button>
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <GithubPanel integrationId={firstId} />
              <PrLifecycleExplainerCard />
            </>
          )}
        </div>
        <div className="space-y-4">
          {firstId && <GithubSetupCard integrationId={firstId} />}
        </div>
      </div>

      <GithubConfigForm
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
      />
    </PageShell>
  );
}

function PrLifecycleExplainerCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle size="base">{t('settings.integration.githubIntegration.prLifecycleTitle')}</CardTitle>
        <CardDescription>
          {t('settings.integration.githubIntegration.prLifecycleDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent >
        <Table >
          <TableHeader variant="muted">
            <TableRow>
              <TableHead density="dense" >{t('settings.integration.githubIntegration.colStatus')}</TableHead>
              <TableHead density="dense" >{t('settings.integration.githubIntegration.colMeaning')}</TableHead>
              <TableHead density="dense" >{t('settings.integration.githubIntegration.colTrustDelta')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell padding="py-1">
                <Badge color="purple-solid" >merged</Badge>
              </TableCell>
              <TableCell padding="py-1">{t('settings.integration.githubIntegration.meaningMerged')}</TableCell>
              <TableCell padding="py-1" >+8</TableCell>
            </TableRow>
            <TableRow>
              <TableCell padding="py-1">
                <Badge variant="secondary">merged_with_comments</Badge>
              </TableCell>
              <TableCell padding="py-1">{t('settings.integration.githubIntegration.meaningMergedComments')}</TableCell>
              <TableCell padding="py-1" >+4</TableCell>
            </TableRow>
            <TableRow>
              <TableCell padding="py-1">
                <Badge variant="destructive">changes_requested</Badge>
              </TableCell>
              <TableCell padding="py-1">{t('settings.integration.githubIntegration.meaningChangesRequested')}</TableCell>
              <TableCell padding="py-1" >−4</TableCell>
            </TableRow>
            <TableRow>
              <TableCell padding="py-1">
                <Badge variant="destructive">closed</Badge>
              </TableCell>
              <TableCell padding="py-1">{t('settings.integration.githubIntegration.meaningClosed')}</TableCell>
              <TableCell padding="py-1" >−2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
