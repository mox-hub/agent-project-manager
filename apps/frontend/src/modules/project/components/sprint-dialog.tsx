import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  isPending?: boolean;
  mode?: 'create' | 'edit';
  initialData?: {
    name: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
  };
}

export function SprintDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  mode = 'create',
  initialData,
}: SprintDialogProps) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // 打开 dialog 时按 mode/initialData 初始化表单（渲染期间调整，避免 effect 内同步 setState）
  const [prevInitKey, setPrevInitKey] = useState('');
  const initKey = open ? `${mode}:${initialData?.name ?? ''}` : '';
  if (prevInitKey !== initKey) {
    setPrevInitKey(initKey);
    if (open && initialData) {
      setName(initialData.name || '');
      setGoal(initialData.goal || '');
      setStartDate(initialData.startDate ? new Date(initialData.startDate) : undefined);
      setEndDate(initialData.endDate ? new Date(initialData.endDate) : undefined);
    } else if (open && mode === 'create') {
      setName('');
      setGoal('');
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    });
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? '创建 Sprint' : '编辑 Sprint'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? '为项目创建一个新的迭代周期'
                : '修改 Sprint 的名称、目标和日期'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sprint-name">
                Sprint 名称 <span className="text-destructive">*</span>
              </label>
              <Input
                id="sprint-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：Sprint 1"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sprint-goal">
                Sprint 目标
              </label>
              <Textarea
                id="sprint-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="描述这个 Sprint 的主要目标和期望成果..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">开始日期</label>
                <DatePicker
                  value={startDate}
                  onValueChange={(date) => {
                    setStartDate(date);
                    if (endDate && date && date > endDate) {
                      setEndDate(undefined);
                    }
                  }}
                  placeholder="选择日期"
                  buttonClassName="w-full"
                  formatDate={(date) => format(date, 'yyyy-MM-dd', { locale: zhCN })}
                  calendarProps={{
                    locale: zhCN,
                    disabled: (date) => date < new Date(),
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">结束日期</label>
                <DatePicker
                  value={endDate}
                  onValueChange={setEndDate}
                  placeholder="选择日期"
                  buttonClassName="w-full"
                  formatDate={(date) => format(date, 'yyyy-MM-dd', { locale: zhCN })}
                  calendarProps={{
                    locale: zhCN,
                    disabled: (date) => date < (startDate || new Date()),
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? '保存中...' : mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
