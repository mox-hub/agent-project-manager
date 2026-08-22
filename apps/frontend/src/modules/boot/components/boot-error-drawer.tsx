import { useState } from 'react';
import { Clipboard, ClipboardCheck, FileWarning } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '../lib/log-formatter';
import type { BootErrorEntry } from '../types';

export interface BootErrorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: BootErrorEntry[];
  onCopy: () => string;
}

export function BootErrorDrawer({ open, onOpenChange, errors, onCopy }: BootErrorDrawerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(onCopy());
    if (ok) {
      setCopied(true);
      toast.success('日志已复制到剪贴板', {
        description: '可粘贴到工单、聊天窗口或邮件中',
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('复制失败，请手动选择文本');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-160">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-destructive" />
            <DialogTitle>启动日志（{errors.length}）</DialogTitle>
          </div>
          <DialogDescription>
            点击右下角「复制日志」可将完整日志（含时间戳与堆栈）写入剪贴板，方便贴到反馈渠道。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-90 overflow-auto rounded-md border border-border/60 bg-muted/30 p-3">
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无错误</p>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">
              {errors.map((err) => (
                <span key={err.id} className="block">
                  <span className="text-destructive">[{err.timestamp}]</span>{' '}
                  <span className="text-foreground">[{err.stepId}]</span> {err.stepTitle}
                  {'\n'}  消息：{err.message}
                  {err.stack ? `\n  堆栈：\n${err.stack.split('\n').map((line) => `    ${line}`).join('\n')}` : ''}
                  {'\n'}  上下文：platform={err.context.platform} mode={err.context.mode} url={err.context.url} tauri={err.context.isTauri}
                </span>
              ))}
            </pre>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={handleCopy} disabled={errors.length === 0}>
            {copied ? (
              <>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                已复制
              </>
            ) : (
              <>
                <Clipboard className="mr-2 h-4 w-4" />
                复制日志
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BootErrorDrawer;