import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Server, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ServerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CUSTOM_API_STORAGE_KEY = 'apm_custom_api_base_url';

export function getEffectiveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(CUSTOM_API_STORAGE_KEY);
    if (custom && custom.trim() !== '') {
      return custom.trim();
    }
  }
  return import.meta.env.VITE_API_BASE_URL || '/_api';
}

export function ServerConfigDialog({ open, onOpenChange }: ServerConfigDialogProps) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(getEffectiveApiBaseUrl());
      setTestResult(null);
    }
  }, [open]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const healthUrl = cleanUrl.endsWith('/_api') ? `${cleanUrl}/health` : `${cleanUrl}/_api/health`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timer);

      if (resp.ok) {
        setTestResult({ ok: true, message: '连接成功，服务正常响应！' });
      } else {
        setTestResult({ ok: false, message: `服务响应异常 (HTTP ${resp.status})` });
      }
    } catch {
      setTestResult({ ok: false, message: '无法连接到该端点，请检查服务是否启动或存在跨域阻断' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = url.trim();
    if (!trimmed || trimmed === '/_api' || trimmed === (import.meta.env.VITE_API_BASE_URL || '')) {
      localStorage.removeItem(CUSTOM_API_STORAGE_KEY);
    } else {
      localStorage.setItem(CUSTOM_API_STORAGE_KEY, trimmed);
    }
    onOpenChange(false);
    window.location.reload();
  };

  const handleReset = () => {
    localStorage.removeItem(CUSTOM_API_STORAGE_KEY);
    setUrl('/_api');
    setTestResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Server className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">服务接入与端点配置</DialogTitle>
              <DialogDescription className="text-xs">
                配置 APM 后端 API 服务地址（适用于私有部署、多工作区或本地多端口开发）
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="api-url-input">
              后端服务基础 URL (API Base URL)
            </label>
            <Input
              id="api-url-input"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="例如 http://localhost:3000/_api 或 https://apm.internal"
              className="font-mono text-xs"
            />
          </div>

          {/* 快捷预设 */}
          <div className="flex items-center gap-2">
            <span className="text-11 text-muted-foreground">常用预设:</span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                setUrl('/_api');
                setTestResult(null);
              }}
              className="text-xs"
            >
              同源代理 (/_api)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => {
                setUrl('http://localhost:3000/_api');
                setTestResult(null);
              }}
              className="text-xs font-mono"
            >
              本地 3000
            </Button>
          </div>

          {/* 测试状态提示 */}
          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-lg p-3 text-xs ${
                testResult.ok
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground"
          >
            恢复默认
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing || !url.trim()}
              className="text-xs"
            >
              {testing ? (
                <>
                  <Spinner className="mr-1 size-3 text-inherit" />
                  测试中
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 size-3" />
                  测试连通
                </>
              )}
            </Button>
            <Button type="button" size="sm" onClick={handleSave} className="text-xs">
              保存并应用
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
