import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CornerDownLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useInterviewDynamic,
  type DynamicInterviewTurn,
} from '@/modules/assistant/hooks/use-interview-dynamic';
import type {
  InterviewPrefillAnswer,
  InterviewPrefillQuestion,
} from '@/modules/assistant/hooks/use-interview-prefill';

interface InterviewChatProps {
  projectId: string;
  questions: InterviewPrefillQuestion[];
  stagePurpose?: string;
  artifactDocumentId?: string;
  /** 追问轮数上限（无状态多轮的成本护栏），达到后引导切回表单 */
  maxTurns?: number;
  onDone: (answers: InterviewPrefillAnswer[]) => void;
  onSwitchToForm: () => void;
}

interface ChatTurn {
  role: 'ai' | 'user';
  text: string;
}

/**
 * AI 会话访谈（CAP-P-01 三期）：AI 访谈员逐轮追问（一问 + 猜测选项），
 * 收敛时把答案集回填给表单（人审改后提交 submitInterview）。
 * 复用 grill 的无状态多轮协议，服务端不感知剧本。
 */
export function InterviewChat({
  projectId,
  questions,
  stagePurpose,
  artifactDocumentId,
  maxTurns = 8,
  onDone,
  onSwitchToForm,
}: InterviewChatProps) {
  const { t } = useTranslation();
  const dynamic = useInterviewDynamic(projectId);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [choices, setChoices] = useState<string[]>([]);

  // 首轮自动开问：ref 防重（StrictMode 双 effect 不双发请求）
  const startedRef = useRef(false);

  const askNext = (history: DynamicInterviewTurn[]) => {
    dynamic.mutate(
      {
        questions,
        history,
        stagePurpose,
        artifactDocumentIds: artifactDocumentId ? [artifactDocumentId] : undefined,
      },
      {
        onSuccess: (result) => {
          if (result.kind === 'question') {
            setTurns((prev) => [...prev, { role: 'ai', text: result.question }]);
            setChoices(result.choices);
          } else {
            onDone(result.answers);
          }
        },
      },
    );
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    askNext([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 已答历史从消息流派生（ai 问 + 紧随的 user 答）
  const history: DynamicInterviewTurn[] = [];
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].role === 'ai' && turns[i + 1]?.role === 'user') {
      history.push({ question: turns[i].text, answer: turns[i + 1].text });
    }
  }
  const reachedMaxTurns = history.length >= maxTurns;

  const send = (text: string) => {
    const answer = text.trim();
    if (!answer || dynamic.isPending || reachedMaxTurns) return;
    const nextHistory = [...history, { question: turns[turns.length - 1]?.text ?? '', answer }];
    setTurns((prev) => [...prev, { role: 'user', text: answer }]);
    setInput('');
    setChoices([]);
    askNext(nextHistory);
  };

  const lastError = dynamic.isError ? (dynamic.error as Error | null)?.message ?? '' : '';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-ai="playbook.interview.chat">
      <div className="flex max-h-72 min-h-40 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-content-bg-secondary/40 p-3">
        {turns.length === 0 && dynamic.isPending ? (
          <p className="flex items-center gap-1.5 text-xs text-content-text-muted">
            <Sparkles className="size-3 animate-pulse text-accent-purple" />
            {t('project.playbookPage.interview.chatThinking')}
          </p>
        ) : null}
        {turns.map((turn, idx) => (
          <div
            key={idx}
            className={cn(
              'max-w-sm rounded-lg px-3 py-2 text-xs leading-relaxed',
              turn.role === 'ai'
                ? 'self-start border border-border bg-content-bg text-content-text'
                : 'self-end bg-accent-blue text-white',
            )}
          >
            {turn.text}
          </div>
        ))}
        {dynamic.isPending && turns.length > 0 ? (
          <p className="flex items-center gap-1.5 self-start text-xs text-content-text-muted">
            <Sparkles className="size-3 animate-pulse text-accent-purple" />
            {t('project.playbookPage.interview.chatThinking')}
          </p>
        ) : null}
      </div>

      {choices.length > 0 && !dynamic.isPending ? (
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice) => (
            <Button
              key={choice}
              variant="outline"
              size="xs"
              className="h-6 px-2 text-11"
              disabled={reachedMaxTurns}
              onClick={() => send(choice)}
            >
              {choice}
            </Button>
          ))}
        </div>
      ) : null}

      {reachedMaxTurns ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-accent-yellow-light/40 px-3 py-2 text-xs text-content-text">
          <span>{t('project.playbookPage.interview.chatMaxTurns')}</span>
          <Button variant="outline" size="xs" className="h-6 shrink-0" onClick={onSwitchToForm}>
            {t('project.playbookPage.interview.modeForm')}
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            disabled={dynamic.isPending || turns.length === 0}
            placeholder={t('project.playbookPage.interview.chatPlaceholder')}
            className="min-h-0 w-full flex-1 resize-none rounded-lg border border-border bg-content-bg px-3 py-2 text-xs text-content-text outline-none transition-colors placeholder:text-content-text-muted focus:border-accent-blue/60"
            data-ai="playbook.interview.chatInput"
          />
          <Button
            size="sm"
            className="h-8 shrink-0"
            disabled={dynamic.isPending || !input.trim() || reachedMaxTurns}
            onClick={() => send(input)}
            data-ai="playbook.interview.chatSend"
          >
            <CornerDownLeft className="size-3.5" />
            {t('project.playbookPage.interview.chatSend')}
          </Button>
        </div>
      )}

      {lastError ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-accent-red-light/50 px-3 py-2 text-xs text-accent-red">
          <span className="min-w-0 flex-1 truncate">
            {t('project.playbookPage.interview.chatFailed', { reason: lastError })}
          </span>
          <Button
            variant="outline"
            size="xs"
            className="h-6 shrink-0"
            disabled={dynamic.isPending}
            onClick={() => askNext(history)}
          >
            {t('project.playbookPage.interview.chatRetry')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
