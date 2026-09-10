import { useState, useRef, useEffect, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import {
  Send,
  Sparkles,
  ChevronUp,
  Bot,
  Minimize2,
} from 'lucide-react';

interface OmniDockProps {
  onSendMessage: (text: string, model: string) => void;
  onExitSurface?: () => void;
  activeAgentName?: string | null;
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
          {activeAgentName ? (
            <span
              className="px-2 py-0.5 rounded-full font-mono flex items-center gap-1"
              style={{ fontSize: 11, background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD' }}
            >
              <Bot className="size-3" />
              <span>定向协同: @{activeAgentName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground/70 font-mono" style={{ fontSize: 11 }}>
              全域 Agent 编队待命
            </span>
          )}

          {/* 快捷指令 */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => handleQuickCommand('/plan CAP-P-01 任务拆解')}
              className="px-2 py-0.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors font-mono"
              style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.04)' }}
            >
              /plan 任务拆解
            </button>
            <button
              type="button"
              onClick={() => handleQuickCommand('/verify 运行契约门禁审计')}
              className="px-2 py-0.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors font-mono"
              style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.04)' }}
            >
              /verify 门禁审计
            </button>
          </div>
        </div>

        {/* 返回人类控制面按钮 */}
        {onExitSurface && (
          <button
            type="button"
            onClick={onExitSurface}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors font-mono"
            style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.06)' }}
            title="返回人类控制面 (Esc)"
          >
            <Minimize2 className="size-3" />
            <span>返回控制面</span>
            <kbd className="px-1 py-0.2 rounded bg-black/40 text-muted-foreground" style={{ fontSize: 9 }}>ESC</kbd>
          </button>
        )}
      </div>

      {/* Dock 主舱体 */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative w-full rounded-2xl p-2 flex items-center gap-2 transition-all duration-300 backdrop-blur-2xl',
        )}
        style={{
          background: 'linear-gradient(135deg, rgba(20, 24, 36, 0.9) 0%, rgba(10, 12, 18, 0.95) 100%)',
          boxShadow: pulseActive
            ? '0 0 40px rgba(139, 92, 246, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            : '0 20px 50px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* 模型切换胶囊 */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/10 text-xs font-medium text-foreground transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          >
            <Sparkles className="size-3.5 text-accent-purple" />
            <span className="truncate" style={{ maxWidth: 110 }}>{currentModelObj.label}</span>
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
              className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl p-1.5 backdrop-blur-2xl shadow-2xl flex flex-col gap-1 border border-white/10 animate-in fade-in zoom-in-95 duration-150 z-50"
              style={{ background: 'rgba(15, 18, 28, 0.95)' }}
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
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors',
                    selectedModel === model.id
                      ? 'bg-white/10 text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                  )}
                >
                  <span>{model.label}</span>
                  <span className="px-1.5 py-0.2 rounded font-mono"
                    style={{ fontSize: 10, background: 'rgba(255, 255, 255, 0.08)' }}
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
            'flex items-center justify-center size-9 rounded-xl transition-all duration-200 shrink-0 text-white',
            input.trim()
              ? 'scale-100 hover:scale-105 shadow-lg cursor-pointer'
              : 'opacity-40 cursor-not-allowed scale-95',
          )}
          style={{
            background: input.trim()
              ? 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)'
              : 'rgba(255, 255, 255, 0.1)',
            boxShadow: input.trim() ? '0 0 16px rgba(139, 92, 246, 0.5)' : 'none',
          }}
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
