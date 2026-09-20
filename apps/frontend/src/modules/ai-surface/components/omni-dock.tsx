import { useState, useRef, useEffect, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  Send,
  Sparkles,
  ChevronUp,
  Bot,
  Minimize2,
  Sun,
  Moon,
} from 'lucide-react';

interface OmniDockProps {
  onSendMessage: (text: string, model: string) => void;
  onExitSurface?: () => void;
  activeAgentName?: string | null;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet', badge: '深度思考' },
  { id: 'gpt-4o', label: 'GPT-4o Omniscient', badge: '多模态' },
  { id: 'deepseek-r1', label: 'DeepSeek R1', badge: '逻辑推演' },
];

export function OmniDock({
  onSendMessage,
  onExitSurface,
  activeAgentName,
  isDark = true,
  onToggleTheme,
}: OmniDockProps) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    // 触发声光能量波纹反馈
    setPulseActive(true);
    setTimeout(() => setPulseActive(false), 800);

    onSendMessage(trimmed, selectedModel);
    setInput('');
  };

  const handleQuickCommand = (cmd: string) => {
    setInput(cmd);
    inputRef.current?.focus();
  };

  // 全局 ESC 键退出
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onExitSurface) {
        onExitSurface();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExitSurface]);

  const currentModelObj =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) ?? AVAILABLE_MODELS[0];

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 select-none"
      style={{ width: 'min(92vw, 780px)' }}
    >
      {/* 顶部悬浮快捷建议条与切换返回提示 */}
      <div className="flex items-center justify-between w-full px-4 text-xs">
        <div className="flex items-center gap-2">
          {/*
            徽章写的必须是**真的会发生的事**。原文案「定向协同: @小码」承诺了两件
            都没发生的事：①消息并没有定向给小码（`dispatch` 是把内容交给 CLI 执行，
            不指定执行者）；②小码的状态当时根本没进派发内容（AI 不知道"它"是谁）。
            现在只承诺切实做到的那一件：发送时把这位同事的当前状态**附带**上去。
          */}
          {activeAgentName ? (
            <span
              className="px-2 py-0.5 rounded-full font-mono flex items-center gap-1"
              title={`发送时会把这名同事的当前状态（在做哪张单、执行状态、最近进展、待决数）一并交给 AI；消息本身仍走既有派发，不指定具体执行者`}
              style={{
                fontSize: 11,
                background: isDark ? 'hsl(var(--accent-purple) / 0.2)' : 'hsl(var(--accent-purple) / 0.12)',
                color: isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))',
              }}
            >
              <Bot className="size-3" />
              <span>附带上下文: @{activeAgentName}</span>
            </span>
          ) : (
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: isDark ? 'hsl(var(--foreground) / 0.6)' : 'hsl(var(--foreground) / 0.6)',
              }}
              title="未选中同事，消息不带盯盘上下文"
            >
              未选中同事 · 发送不带上下文
            </span>
          )}

          {/* 快捷指令 */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => handleQuickCommand('/plan CAP-P-01 任务拆解')}
              className="px-2 py-0.5 rounded-md hover:opacity-80 text-muted-foreground hover:text-foreground transition-colors font-mono cursor-pointer"
              style={{
                fontSize: 11,
                background: isDark ? 'hsl(var(--foreground) / 0.05)' : 'hsl(var(--foreground) / 0.05)',
              }}
            >
              /plan 任务拆解
            </button>
            <button
              type="button"
              onClick={() => handleQuickCommand('/verify 运行契约门禁审计')}
              className="px-2 py-0.5 rounded-md hover:opacity-80 text-muted-foreground hover:text-foreground transition-colors font-mono cursor-pointer"
              style={{
                fontSize: 11,
                background: isDark ? 'hsl(var(--foreground) / 0.05)' : 'hsl(var(--foreground) / 0.05)',
              }}
            >
              /verify 门禁审计
            </button>
          </div>
        </div>

        {/* 右侧控制栏：主题切换与退出人类控制面 */}
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors font-mono cursor-pointer"
              style={{
                fontSize: 11,
                background: isDark ? 'hsl(var(--foreground) / 0.06)' : 'hsl(var(--foreground) / 0.06)',
              }}
              title={isDark ? '切换至日间模式' : '切换至夜间模式'}
            >
              {isDark ? (
                <Sun className="size-3" style={{ color: 'hsl(var(--accent-yellow))' }} />
              ) : (
                <Moon className="size-3" style={{ color: 'hsl(var(--accent-blue))' }} />
              )}
              <span>{isDark ? '深空' : '明眸'}</span>
            </button>
          )}

          {onExitSurface && (
            <button
              type="button"
              onClick={onExitSurface}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors font-mono cursor-pointer"
              style={{
                fontSize: 11,
                background: isDark ? 'hsl(var(--foreground) / 0.06)' : 'hsl(var(--foreground) / 0.06)',
              }}
              title="返回人类控制面 (Esc)"
            >
              <Minimize2 className="size-3" />
              <span>返回控制面</span>
              <kbd
                className="px-1 py-0.2 rounded font-mono"
                style={{
                  fontSize: 9,
                  background: isDark ? 'hsl(var(--background) / 0.5)' : 'hsl(var(--foreground) / 0.08)',
                }}
              >
                ESC
              </kbd>
            </button>
          )}
        </div>
      </div>

      {/* Dock 主舱体 */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative w-full rounded-2xl p-2 flex items-center gap-2 transition-all duration-300 backdrop-blur-2xl border',
          !pulseActive && 'shadow-xs',
        )}
        style={{
          borderColor: isDark ? 'hsl(var(--foreground) / 0.08)' : 'hsl(var(--accent-purple) / 0.18)',
          background: isDark
            ? 'linear-gradient(135deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.96) 100%)'
            : 'linear-gradient(135deg, hsl(var(--card) / 0.95) 0%, hsl(var(--card) / 0.92) 100%)',
        }}
      >
        {/* 模型切换胶囊 */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground transition-colors cursor-pointer"
            style={{
              background: isDark ? 'hsl(var(--foreground) / 0.06)' : 'hsl(var(--accent-purple) / 0.08)',
            }}
          >
            <Sparkles className="size-3.5 text-accent-purple" />
            <span className="truncate" style={{ maxWidth: 110 }}>
              {currentModelObj.label}
            </span>
            <ChevronUp
              className={cn(
                'size-3 text-muted-foreground transition-transform',
                !modelDropdownOpen && 'rotate-180',
              )}
            />
          </button>

          {/* 模型弹出列表 */}
          {modelDropdownOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl p-1.5 backdrop-blur-2xl shadow-xs flex flex-col gap-1 border animate-in fade-in zoom-in-95 duration-150 z-50"
              style={{
                borderColor: isDark ? 'hsl(var(--foreground) / 0.1)' : 'hsl(var(--accent-purple) / 0.15)',
                background: isDark ? 'hsl(var(--background) / 0.96)' : 'hsl(var(--card) / 0.98)',
              }}
            >
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(model.id);
                    setModelDropdownOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer',
                    selectedModel === model.id
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  style={{
                    background:
                      selectedModel === model.id
                        ? isDark
                          ? 'hsl(var(--foreground) / 0.12)'
                          : 'hsl(var(--accent-purple) / 0.12)'
                        : undefined,
                  }}
                >
                  <span>{model.label}</span>
                  <span
                    className="px-1.5 py-0.2 rounded font-mono"
                    style={{
                      fontSize: 10,
                      background: isDark ? 'hsl(var(--foreground) / 0.08)' : 'hsl(var(--accent-purple) / 0.08)',
                    }}
                  >
                    {model.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 自然语言输入框 */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入协同指令，或使用 / 唤起技能，@ 呼唤指定 Agent..."
            className="w-full bg-transparent border-none outline-none px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 font-normal"
          />
        </div>

        {/* 发送按钮 */}
        <button
          type="submit"
          disabled={!input.trim()}
          className={cn(
            'flex items-center justify-center size-9 rounded-xl transition-all duration-200 shrink-0',
            // 文字色随底走：可用态底是 accent-purple 渐变（→ primary-foreground），
            // 禁用态底是 foreground/0.1 中性微叠层（→ muted-foreground，用 primary
            // 反而会在明眸主题变成近白字叠浅灰底 → 不可见）
            input.trim()
              ? 'scale-100 hover:scale-105 shadow-xs cursor-pointer text-primary-foreground'
              : 'opacity-40 cursor-not-allowed scale-95 text-muted-foreground',
          )}
          style={{
            background: input.trim()
              ? 'linear-gradient(135deg, hsl(var(--accent-purple)) 0%, hsl(var(--accent-purple)) 100%)'
              : isDark
              ? 'hsl(var(--foreground) / 0.1)'
              : 'hsl(var(--foreground) / 0.1)',
          }}
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
