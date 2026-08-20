import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FolderPlus, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { switchWorkspace, workspaceApi } from '../api/workspace-api';

/**
 * 创建工作区：手动指定目录位置，系统完成初始化
 * （建 data/uploads/logs + 复制模板库 + 注册表登记），成功后自动切换。
 */
export default function NewWorkspacePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !pathInput.trim()) return;
    setCreating(true);
    try {
      const record = await workspaceApi.create({
        name: name.trim(),
        path: pathInput.trim(),
      });
      toast.success(`工作区「${record.name}」已创建，即将切换`);
      switchWorkspace(record.id);
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      setError(apiError.response?.data?.error?.message || '创建失败，请检查路径与权限');
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageShell>
      <SubPageToolbar
        aiId="workspace.new"
        onBack={() => navigate('/app/projects/dashboard')}
        breadcrumbs={[{ label: '新建工作区' }]}
      />
      <PageHeader title="新建工作区" icon={FolderPlus} />
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-accent-blue" />
              指定工作区位置
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">工作区名称 *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="如: 个人项目 / 公司A"
                  required
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">目录位置（绝对路径） *</label>
                <Input
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  placeholder="如: D:\apm-workspaces\company-a"
                  required
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  目录须为空或不存在；系统将创建 data/uploads/logs 子目录并初始化独立数据库。
                  工作区之间完全隔离，切换后需重新登录（初始账号 admin / password123）。
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-accent-red/10 px-3 py-2 text-xs text-accent-red">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)}>
                  取消
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={creating || !name.trim() || !pathInput.trim()}
                >
                  {creating ? '初始化中…' : '创建并切换'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
