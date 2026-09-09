import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, FileText, Inbox, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  PlaybookStageTemplate,
  SubmitInterviewResponse,
} from '../../api/playbook-api';
import { useSubmitInterview } from '../../hooks/use-playbook';
import { useInterviewPrefill } from '@/modules/assistant/hooks/use-interview-prefill';

interface InterviewDialogProps {
  projectId: string;
  stage: PlaybookStageTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 阶段访谈向导（v2 纪要 §2.4「对照翻译」）：
 * 人话提问收集 → 服务端确定性转写成正式工件 → 展示「你说的 → 专业术语」对照
 * → 引导去决策收件箱过闸门。AI 不替用户拍板，闸门在收件箱。
 * CAP-P-01 一期：可按一句话需求（或 grill 摘要）AI 预填候选——只填空字段，人始终可改。
 */
export function InterviewDialog({ projectId, stage, open, onOpenChange }: InterviewDialogProps) {
  const { t } = useTranslation();
  const submit = useSubmitInterview(projectId);
  const prefill = useInterviewPrefill(projectId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [requirement, setRequirement] = useState('');
  const [result, setResult] = useState<SubmitInterviewResponse | null>(null);

  const questions = useMemo(() => stage?.interview ?? [], [stage]);

  const reset = () => {
    setAnswers({});
    setRequirement('');
    setResult(null);
    submit.reset();
    prefill.reset();
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const canSubmit =
    questions.length > 0 &&
    questions.every((q) => (answers[q.id] ?? '').trim().length > 0) &&
    !submit.isPending;

  const handlePrefill = () => {
    if (!stage || prefill.isPending) return;
    prefill.mutate(
      {
        requirement: requirement.trim(),
        questions: questions.map((q) => ({ id: q.id, question: q.question, hint: q.hint })),
      },
      {
        // 只填空字段：已手填的答案绝不覆盖
        onSuccess: (filled) =>
          setAnswers((prev) => {
            const next = { ...prev };
            for (const item of filled) {
              if (!(next[item.questionId] ?? '').trim()) {
                next[item.questionId] = item.answer;
              }
            }
            return next;
          }),
      },
    );
  };

  const handleSubmit = () => {
    if (!stage) return;
    submit.mutate(
      {
        stageKey: stage.key,
        answers: questions.map((q) => ({
          questionId: q.id,
          answer: (answers[q.id] ?? '').trim(),
        })),
      },
      { onSuccess: (res) => setResult(res) },
    );
  };

  if (!stage) return null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t('project.playbookPage.interview.title', { stage: stage.name })}
              </DialogTitle>
              <DialogDescription>{stage.purpose}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-content-bg-secondary/40 px-3 py-2">
              <Sparkles className="size-3.5 shrink-0 text-accent-purple" />
              <input
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder={t('project.playbookPage.interview.requirementPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-xs text-content-text outline-none placeholder:text-content-text-muted"
                data-ai="playbook.interview.requirement"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 shrink-0 gap-1 px-2 text-xs"
                disabled={prefill.isPending}
                onClick={handlePrefill}
                data-ai="playbook.interview.aiPrefill"
              >
                <Sparkles className={cn('size-3', prefill.isPending && 'animate-pulse')} />
                {prefill.isPending
                  ? t('project.playbookPage.interview.aiPrefilling')
                  : t('project.playbookPage.interview.aiPrefill')}
              </Button>
            </div>
            {prefill.isError ? (
              <p className="rounded-lg bg-accent-red-light/50 px-3 py-2 text-xs text-accent-red">
                {t('project.playbookPage.interview.aiPrefillFailed', {
                  reason: prefill.error instanceof Error ? prefill.error.message : '',
                })}
              </p>
            ) : null}
            <div className="space-y-4 py-1">
              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-1.5">
                  <label
                    htmlFor={`q-${q.id}`}
                    className="text-xs font-medium text-content-text"
                  >
                    <span className="mr-1.5 text-content-text-muted">{idx + 1}.</span>
                    {q.question}
                  </label>
                  <textarea
                    id={`q-${q.id}`}
                    value={answers[q.id] ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder={q.hint ?? t('project.playbookPage.interview.placeholder')}
                    rows={2}
                    className="w-full resize-y rounded-lg border border-border bg-content-bg px-3 py-2 text-xs text-content-text outline-none transition-colors placeholder:text-content-text-muted focus:border-accent-blue/60"
                    data-ai={`playbook.interview.answer.${q.id}`}
                  />
                </div>
              ))}
            </div>
            {submit.isError ? (
              <p className="rounded-lg bg-accent-red-light/50 px-3 py-2 text-xs text-accent-red">
                {t('project.playbookPage.interview.failed', {
                  reason: submit.error instanceof Error ? submit.error.message : '',
                })}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                {t('common.cancel')}
              </Button>
              <Button disabled={!canSubmit} onClick={handleSubmit} data-ai="playbook.interview.submit">
                <Check className="size-3.5" />
                {t('project.playbookPage.interview.submit')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('project.playbookPage.interview.doneTitle')}</DialogTitle>
              <DialogDescription>{t('project.playbookPage.interview.doneDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2.5 rounded-lg border border-accent-blue/30 bg-accent-blue-light/40 px-3 py-2 text-xs">
                <FileText className="size-4 shrink-0 text-accent-blue" />
                <span className="flex-1 truncate font-medium text-content-text">
                  {result.documentTitle}
                </span>
              </div>
              {result.mappings.length > 0 ? (
                <div className="rounded-lg border border-border bg-content-bg-secondary/40 p-3">
                  <p className="mb-2 text-11 font-medium text-content-text-muted">
                    {t('project.playbookPage.interview.mappingTitle')}
                  </p>
                  <div className="space-y-1.5">
                    {result.mappings.map((m) => (
                      <div key={m.questionId} className="text-11 leading-relaxed">
                        <span className="text-content-text-muted">「{m.answerExcerpt}」</span>
                        {m.term ? (
                          <>
                            <ArrowRight className="mx-1 inline size-3 text-accent-purple" />
                            <span className="font-medium text-accent-purple">{m.term}</span>
                          </>
                        ) : null}
                        {m.termNote ? (
                          <span className="block text-content-text-muted">{m.termNote}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>
                {t('common.close')}
              </Button>
              <Button asChild data-ai="playbook.interview.gotoInbox" className={cn('gap-1.5')}>
                <Link to="/app/decisions">
                  <Inbox className="size-3.5" />
                  {t('project.playbookPage.interview.goInbox')}
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
