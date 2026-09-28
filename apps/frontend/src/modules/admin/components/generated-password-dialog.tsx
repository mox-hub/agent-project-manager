import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

/** 随机密码一次性展示弹窗（建号/重置密码共用） */
export function GeneratedPasswordDialog({
  open,
  onOpenChange,
  password,
  displayName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: string;
  displayName?: string;
}) {
  const { t } = useTranslation();
  const { copyToClipboard, isCopied } = useCopyToClipboard({ timeout: 2000 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={16} className="text-accent-yellow" />
            {t('admin.passwordGenerated', '初始密码')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.passwordGeneratedDesc', '仅此一次展示，请复制后线下告知成员。')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {displayName ? (
            <p className="text-sm text-muted-foreground">
              {t('admin.accountFor', '账号')}：{displayName}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Input
              readOnly
              value={password}
              className="font-mono"
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => copyToClipboard(password)}
            >
              {isCopied
                ? t('admin.copied', '已复制')
                : t('admin.copy', '复制')}
            </Button>
          </div>
          <Alert>
            <AlertTitle>
              {t('admin.passwordOnceTitle', '关闭后无法再次查看')}
            </AlertTitle>
            <AlertDescription>
              {t(
                'admin.passwordOnceDesc',
                '成员首次登录后可在「设置 → 个人资料」中修改密码。',
              )}
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t('admin.done', '完成')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
