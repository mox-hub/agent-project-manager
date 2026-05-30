import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  RotateCcw,
  SkipForward,
  Settings,
  UserPlus,
  XCircle,
  CheckCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { RecoveryAction, ExecutionRun, ExecutionStep } from '../api/execution-api';

interface ExecutionRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  run?: ExecutionRun;
  steps?: ExecutionStep[];
  onRecovery: (action: RecoveryAction, options?: {
    stepId?: string;
    params?: Record<string, unknown>;
    escalateTo?: string;
    reason?: string;
  }) => void;
  isRecovering?: boolean;
}

const recoveryOptions = [
  {
    id: 'retry' as RecoveryAction,
    title: '重新执行',
    description: '从头开始重新执行整个任务',
    icon: RotateCcw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'retry_step' as RecoveryAction,
    title: '重试步骤',
    description: '从失败的步骤开始重试',
    icon: SkipForward,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    requiresStep: true,
  },
  {
    id: 'adjust_params' as RecoveryAction,
    title: '调整参数',
    description: '修改执行参数后重新执行',
    icon: Settings,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
  {
    id: 'escalate' as RecoveryAction,
    title: '转交人工',
    description: '将任务转交给人工处理',
    icon: UserPlus,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
  },
  {
    id: 'abort' as RecoveryAction,
    title: '放弃执行',
    description: '终止执行并标记为失败',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    isDestructive: true,
  },
];

function RecoveryOptionCard({
  option,
  isSelected,
  onClick,
  disabled,
}: {
  option: (typeof recoveryOptions)[0];
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/30 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', option.bgColor)}>
        <option.icon className={cn('h-5 w-5', option.color)} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{option.title}</span>
          {option.isDestructive && (
            <Badge variant="destructive" className="text-xs">危险操作</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
      </div>
      {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
    </button>
  );
}

function StepSelector({
  steps,
  selectedStepId,
  onSelect,
}: {
  steps: ExecutionStep[];
  selectedStepId: string | null;
  onSelect: (stepId: string) => void;
}) {
  const failedSteps = steps.filter((s) => s.status === 'failed');

  return (
    <div className="space-y-2">
      <Label>选择要重试的步骤</Label>
      <ScrollArea className="h-[120px] rounded-lg border">
        <div className="p-2 space-y-1">
          {failedSteps.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">没有失败的步骤</p>
          )}
          {failedSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelect(step.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors',
                selectedStepId === step.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted',
              )}
            >
              <XCircle className="h-4 w-4 text-destructive" />
              <div className="flex-1">
                <span className="text-sm font-medium">{step.name}</span>
                {step.error && (
                  <p className="text-xs text-muted-foreground truncate">
                    {step.error}
                  </p>
                )}
              </div>
              {selectedStepId === step.id && <CheckCircle className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ParamsEditor({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (newKey.trim()) {
      onChange({ ...params, [newKey.trim()]: newValue || '' });
      setNewKey('');
      setNewValue('');
    }
  };

  const handleRemove = (key: string) => {
    const newParams = { ...params };
    delete newParams[key];
    onChange(newParams);
  };

  return (
    <div className="space-y-3">
      <Label>调整执行参数</Label>

      {Object.entries(params).length > 0 && (
        <ScrollArea className="h-[100px] rounded-lg border">
          <div className="p-2 space-y-1">
            {Object.entries(params).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center gap-2 rounded-md bg-muted/50 p-2"
              >
                <span className="text-sm font-medium">{key}:</span>
                <span className="flex-1 text-sm text-muted-foreground truncate">
                  {String(value)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(key)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="参数名"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="参数值"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          添加
        </Button>
      </div>
    </div>
  );
}

function EscalationForm({
  escalateTo,
  onEscalateToChange,
  reason,
  onReasonChange,
}: {
  escalateTo: string;
  onEscalateToChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
}) {
  const assigneeOptions = [
    { id: 'team_lead', name: '团队负责人' },
    { id: 'project_manager', name: '项目经理' },
    { id: 'senior_dev', name: '高级开发者' },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>转交给</Label>
        <Select value={escalateTo} onValueChange={onEscalateToChange}>
          <SelectTrigger>
            <SelectValue placeholder="选择接收人" />
          </SelectTrigger>
          <SelectContent>
            {assigneeOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>转交原因（可选）</Label>
        <Textarea
          placeholder="描述转交的原因和背景..."
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={2}
        />
      </div>
    </div>
  );
}

export function ExecutionRecoveryDialog({
  open,
  onOpenChange,
  taskId,
  run,
  steps,
  onRecovery,
  isRecovering,
}: ExecutionRecoveryDialogProps) {
  const [selectedAction, setSelectedAction] = useState<RecoveryAction | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [adjustedParams, setAdjustedParams] = useState<Record<string, unknown>>({});
  const [escalateTo, setEscalateTo] = useState('');
  const [escalateReason, setEscalateReason] = useState('');

  const failedSteps = useMemo(
    () => steps?.filter((s) => s.status === 'failed') ?? [],
    [steps],
  );

  const canProceed = useMemo(() => {
    if (!selectedAction) return false;
    if (selectedAction === 'retry_step' && !selectedStepId) return false;
    if (selectedAction === 'escalate' && !escalateTo) return false;
    return true;
  }, [selectedAction, selectedStepId, escalateTo]);

  const handleConfirm = () => {
    if (!selectedAction) return;

    let options: Parameters<typeof onRecovery>[1] = {};

    switch (selectedAction) {
      case 'retry_step':
        options = { stepId: selectedStepId || undefined };
        break;
      case 'adjust_params':
        options = { params: adjustedParams };
        break;
      case 'escalate':
        options = {
          escalateTo,
          reason: escalateReason || undefined,
        };
        break;
      case 'abort':
        options = { reason: escalateReason || undefined };
        break;
    }

    onRecovery(selectedAction, options);
    handleClose();
  };

  const handleClose = () => {
    setSelectedAction(null);
    setSelectedStepId(null);
    setAdjustedParams({});
    setEscalateTo('');
    setEscalateReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            执行失败恢复
          </DialogTitle>
          <DialogDescription>
            选择恢复方式来解决执行失败的问题
          </DialogDescription>
        </DialogHeader>

        {run?.error && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">错误信息</p>
            <p className="mt-1 text-sm text-destructive/80">{run.error}</p>
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-base font-medium">选择恢复操作</Label>
            <div className="space-y-2">
              {recoveryOptions.map((option) => (
                <RecoveryOptionCard
                  key={option.id}
                  option={option}
                  isSelected={selectedAction === option.id}
                  onClick={() => setSelectedAction(option.id)}
                  disabled={
                    option.requiresStep &&
                    failedSteps.length === 0
                  }
                />
              ))}
            </div>
          </div>

          {selectedAction === 'retry_step' && (
            <StepSelector
              steps={steps ?? []}
              selectedStepId={selectedStepId}
              onSelect={setSelectedStepId}
            />
          )}

          {selectedAction === 'adjust_params' && (
            <ParamsEditor
              params={adjustedParams}
              onChange={setAdjustedParams}
            />
          )}

          {selectedAction === 'escalate' && (
            <EscalationForm
              escalateTo={escalateTo}
              onEscalateToChange={setEscalateTo}
              reason={escalateReason}
              onReasonChange={setEscalateReason}
            />
          )}

          {selectedAction === 'abort' && (
            <div className="space-y-2">
              <Label>终止原因（可选）</Label>
              <Textarea
                placeholder="描述终止的原因..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canProceed || isRecovering}
            variant={selectedAction === 'abort' ? 'destructive' : 'default'}
          >
            {isRecovering ? '处理中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
