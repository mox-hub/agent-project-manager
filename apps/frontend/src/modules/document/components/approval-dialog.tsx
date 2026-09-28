// Approval Dialog Component - 审批对话框组件
import React, { useState } from 'react';
import { StatusPill } from '@/components/ui/status-pill';
import * as Icons from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
  mode: 'submit' | 'approve' | 'reject';
  documentTitle?: string;
  isLoading?: boolean;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  onApprove,
  onReject,
  mode,
  documentTitle,
  isLoading = false,
}: ApprovalDialogProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (mode === 'submit') {
      onApprove(comment); // For submit, reuse approve handler
    } else if (mode === 'approve') {
      onApprove(comment);
    } else {
      onReject(comment);
    }
    setComment('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setComment('');
    }
    onOpenChange(newOpen);
  };

  const titles: Record<string, string> = {
    submit: '提交审核',
    approve: '审批通过',
    reject: '审批拒绝',
  };

  const descriptions: Record<string, string> = {
    submit: `确定要提交「${documentTitle}」进行审核吗？`,
    approve: `确定要通过「${documentTitle}」的审核申请吗？`,
    reject: `确定要拒绝「${documentTitle}」的审核申请吗？`,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'approve' && (
              <Icons.CheckCircle className="h-5 w-5 text-accent-green" />
            )}
            {mode === 'reject' && (
              <Icons.XCircle className="h-5 w-5 text-destructive" />
            )}
            {mode === 'submit' && (
              <Icons.Send className="h-5 w-5 text-accent-blue" />
            )}
            {titles[mode]}
          </DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approval-comment">
              {mode === 'reject' ? '拒绝原因' : '备注'}
            </Label>
            <Textarea
              id="approval-comment"
              placeholder={mode === 'reject' ? '请输入拒绝原因...' : '添加备注（可选）...'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          {mode === 'reject' ? (
            <Button
              type="button"
              variant="destructive"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? '提交中...' : '确认拒绝'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? '提交中...' : mode === 'submit' ? '提交审核' : '确认通过'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 状态显示组件
interface ApprovalStatusProps {
  status: 'pending' | 'approved' | 'rejected' | 'draft' | 'reviewing' | 'published';
  className?: string;
}

export function ApprovalStatus({ status, className }: ApprovalStatusProps) {
  const statusConfig: Record<string, { icon: React.ReactNode; label: string; tone: 'default' | 'warning' | 'success' | 'danger' }> = {
    draft: {
      icon: <Icons.FileEdit className="h-4 w-4" />,
      label: '草稿',
      tone: 'default',
    },
    reviewing: {
      icon: <Icons.Clock className="h-4 w-4" />,
      label: '审核中',
      tone: 'warning',
    },
    published: {
      icon: <Icons.CheckCircle className="h-4 w-4" />,
      label: '已发布',
      tone: 'success',
    },
    rejected: {
      icon: <Icons.XCircle className="h-4 w-4" />,
      label: '已拒绝',
      tone: 'danger',
    },
    pending: {
      icon: <Icons.Hourglass className="h-4 w-4" />,
      label: '待审批',
      tone: 'warning',
    },
    approved: {
      icon: <Icons.CheckCircle className="h-4 w-4" />,
      label: '已通过',
      tone: 'success',
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <StatusPill tone={config.tone} className={className ? `${className} gap-1.5` : 'gap-1.5'}>
      {config.icon}
      {config.label}
    </StatusPill>
  );
}
