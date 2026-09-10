/**
 * GrillInterview —— 统一创建面板「AI 代理模式」的需求拷问会话体。
 *
 * 交互：一句话草稿 → AI 连续追问（一次一问，选项快选 + 自由输入兜底）→
 * 收敛出结构化需求摘要 → 用户确认后回调 onConfirm 交给宿主创建项目。
 * 会话态全在本地 useState（无服务端会话）；任何时刻可降级 onFallback 改手动。
 */
import { useState } from 'react';
import { ArrowRight, CircleAlert, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useGrill, type GrillChoice, type GrillSummary, type GrillTurn } from '@/modules/assistant/hooks/use-grill';

interface GrillInterviewProps {
  /** 摘要确认后交给宿主（创建项目 + 跳转） */
  onConfirm: (summary: GrillSummary) => void;
  /** 降级：改用手动填写 */
  onFallback: () => void;
  /** 宿主创建中（确认按钮禁用） */
  confirmPending?: boolean;
}

interface AskedTurn extends GrillTurn {
  choices?: Array<{ label: string; sub?: string; guess?: boolean }>;
}

export function GrillInterview({ onConfirm, onFallback, confirmPending = false }: GrillInterviewProps) {
  const grill = useGrill();

  const [draft, setDraft] = useState('');
  const [started, setStarted] = useState(false);
  const [turns, setTurns] = useState<AskedTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentChoices, setCurrentChoices] = useState<GrillChoice[]>([]);
  const [freeText, setFreeText] = useState('');
  const [summary, setSummary] = useState<GrillSummary | null>(null);

  const ask = (history: GrillTurn[], input?: string) => {
    grill.mutate(
      { draft: input ?? draft.trim(), history },
      {
        onSuccess: (result) => {
          if (result.kind === 'question') {
            setCurrentQuestion(result.question);
            setCurrentChoices(result.choices);
          } else {
            setCurrentQuestion(null);
            setCurrentChoices([]);
            setSummary(result.summary);
          }
        },
      },
    );
  };

  const start = () => {
    if (!draft.trim() || grill.isPending) return;
    setStarted(true);
    setTurns([]);
    setSummary(null);
    ask([]);
  };

  const answer = (text: string, choice?: GrillChoice) => {
    if (!currentQuestion || grill.isPending) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const history = [...turns, { question: currentQuestion, answer: trimmed }];
    setTurns([...history, { question: currentQuestion, answer: trimmed, choices: choice ? [choice] : undefined }]);
    setFreeText('');
    setCurrentQuestion(null);
    setCurrentChoices([]);
    ask(history);
  };

  const retry = () => {
    ask(turns.map(({ question, answer: a }) => ({ question, answer: a })));
  };

  const restart = () => {
    grill.reset();
    setStarted(false);
    setTurns([]);
    setCurrentQuestion(null);
    setCurrentChoices([]);
    setSummary(null);
  };

  // ── 摘要确认态 ──
  if (summary) {
    const canCreate = summary.name.trim().length > 0;
    return (
      <div className="flex flex-1 flex-col gap-3" data-ai-component="create.grill-summary">
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
          <span>
            需求已经拷问清楚啦。确认或修改下面的摘要，创建后它会被存为「需求澄清纪要」，并自动挂上需求承接剧本。
          </span>
        </div>
        <div className="space-y-3 rounded-lg border border-border bg-content-bg-secondary/30 p-3">
          <label className="block space-y-1.5">
            <span className="text-10 font-semibold uppercase tracking-wider text-muted-foreground">项目名</span>
            <Input
              value={summary.name}
              onChange={(e) => setSummary({ ...summary, name: e.target.value })}
              className="font-medium"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-10 font-semibold uppercase tracking-wider text-muted-foreground">一句话介绍</span>
            <Textarea
              rows={2}
              value={summary.description}
              onChange={(e) => setSummary({ ...summary, description: e.target.value })}
              className="resize-none text-xs"
            />
          </label>
          <SummaryList
            title="这一期做什么"
            items={summary.scope}
            onChange={(items) => setSummary({ ...summary, scope: items })}
          />
          <SummaryList
            title="明确不做什么"
            items={summary.nonGoals}
            onChange={(items) => setSummary({ ...summary, nonGoals: items })}
          />
          <SummaryList
            title="怎么算做完"
            items={summary.acceptanceHints}
            onChange={(items) => setSummary({ ...summary, acceptanceHints: items })}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" disabled={!canCreate || confirmPending} onClick={() => onConfirm(summary)}>
            {confirmPending ? <Spinner className="size-3.5 text-inherit" /> : <ArrowRight size={14} />}
            创建项目
          </Button>
          <Button variant="ghost" size="sm" onClick={restart}>重新拷问</Button>
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onFallback}>
            改用手动填写
          </Button>
        </div>
      </div>
    );
  }

  // ── 会话态 ──
  if (started) {
    return (
      <div className="flex flex-1 flex-col gap-3 min-h-0" data-ai-component="create.grill-session">
        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
          <GrillBubble text={draft.trim()} />

          {turns.map((turn, i) => (
            <div key={i} className="space-y-1.5">
              <GrillBubble text={turn.question} />
              <div className="flex items-start gap-2 pl-4">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-blue" />
                <p className="text-sm text-foreground">{turn.answer}</p>
              </div>
            </div>
          ))}

          {grill.isPending ? (
            <p className="flex items-center gap-2 pl-4 text-xs text-muted-foreground">
              <Spinner className="size-3.5" /> 正在琢磨下一个问题…
            </p>
          ) : null}

          {grill.isError ? (
            <div className="flex items-start gap-2 pl-4 text-xs text-accent-red">
              <CircleAlert size={13} className="mt-0.5 shrink-0" />
              <span>
                {grill.error instanceof Error ? grill.error.message : '拷问中断了'}
                <button type="button" className="ml-2 underline underline-offset-2" onClick={retry}>
                  重试
                </button>
              </span>
            </div>
          ) : null}

          {currentQuestion ? (
            <div className="space-y-1.5">
              <GrillBubble text={currentQuestion} />
              {currentChoices.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {currentChoices.map((choice) => (
                    <button
                      key={choice.key}
                      type="button"
                      onClick={() => answer(choice.label, choice)}
                      title={choice.sub}
                      className="h-7 rounded-full border border-border px-2.5 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      {choice.label}
                      {choice.guess ? <span className="ml-1 text-10 text-muted-foreground">猜</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {currentQuestion ? (
          <div className="flex items-center gap-2">
            <Input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) answer(freeText);
              }}
              placeholder="用自己的话回答，回车发送"
              autoFocus
            />
            <Button size="sm" variant="outline" className="gap-1 shrink-0" disabled={!freeText.trim() || grill.isPending} onClick={() => answer(freeText)}>
              回答
            </Button>
          </div>
        ) : null}

        <div className="flex items-center">
          <span className="text-10 text-muted-foreground">{turns.length} 问已答</span>
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onFallback}>
            跳过，改用手动填写
          </Button>
        </div>
      </div>
    );
  }

  // ── 草稿输入态 ──
  return (
    <div className="flex flex-1 flex-col gap-3" data-ai-component="create.grill-draft">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-content-bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
        <span>
          一句话描述你想做的东西，AI 会连续追问几个问题把需求问清楚（选项可以直接点，也可以自己输入），最后生成一份摘要供你确认。
        </span>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        autoFocus
        placeholder="例如：想给我们小组做一个记录会议决定的小工具，现在每次开完会都记不清谁答应了什么"
        className="flex-1 resize-none rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:ring-0 focus-visible:border-primary/50"
      />
      <div className="flex items-center">
        <Button size="sm" className="gap-1.5" disabled={!draft.trim() || grill.isPending} onClick={start}>
          <Sparkles size={14} />
          开始拷问
        </Button>
        <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onFallback}>
          改用手动填写
        </Button>
      </div>
    </div>
  );
}

/** AI 提问气泡 */
function GrillBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
      <p className={cn('rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground')}>{text}</p>
    </div>
  );
}

/** 摘要条目列表（可删除单条） */
function SummaryList({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <span className="text-10 font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="group flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">{item}</span>
            <button
              type="button"
              aria-label="移除"
              className="text-10 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-red"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              移除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
