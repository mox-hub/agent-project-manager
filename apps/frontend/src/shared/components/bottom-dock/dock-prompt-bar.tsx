/**
 * Dock 展开态的 Prompt 输入行 —— 受托 AI 同事头像 + 输入框 + 发送/收起。
 * 2026-10-02 自 bottom-dock 内联收编为独立件（用户验收：文本与发送图标未居中）：
 * - 输入框显式 h-8，与头像/发送按钮同高同行——单行 input 由浏览器保证文本
 *   在自身盒内垂直居中，不再依赖自适应高度的隐式对齐；
 * - 发送图标不做方向性微调：lucide Send 在 24 栅格内包围盒对称，几何居中即视觉居中
 *   （原 `translate-x-px -translate-y-px` 是反向修正，反而把图标推向右上）。
 */
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
import { STATUS_DOT_CLASS, type DockAiColleague } from './use-dock-ai-colleagues';

export interface DockPromptBarProps {
  /** 当前受托的 AI 同事（头像、状态点与占位文案来源） */
  colleague: DockAiColleague;
  value: string;
  onValueChange: (value: string) => void;
  onSend: () => void;
  /** 收起输入栏（默认同时关闭上方 AI 对话面板，由宿主决定） */
  onClose: () => void;
}

export function DockPromptBar({
  colleague,
  value,
  onValueChange,
  onSend,
  onClose,
}: DockPromptBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 挂载即聚焦（展开动画落定后），卸载自动清理
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="flex w-full items-center gap-2"
      data-testid="dock-prompt-bar"
    >
      {/* 左侧：选中的 AI 角色真实头像（带真实在线状态点） */}
      <div className="relative shrink-0 pl-1">
        {/* 容器 32px 与头像 md 档对齐，头像完全填满；描边用不占布局的 ring；
            状态点在外层 relative 上，不被裁切 */}
        <div
          className="flex size-8 items-center justify-center rounded-full shadow-xs ring-1 ring-border/60"
          title={`当前受托角色：${colleague.name} (${colleague.title || 'AI 同事'})`}
        >
          {/* 统一交给 MemberAvatar：成员信息里有真实头像就显示真实头像，
              没有则回落双表面规范里 AI 身份该有的确定性头像（与成员管理页一致），
              而不是此处另画一个通用图标 */}
          <MemberAvatar
            member={{
              type: 'ai_agent',
              displayName: colleague.name,
              avatarUrl: colleague.avatarUrl,
            }}
            size="md"
            showBadge={false}
          />
        </div>
        {/* 真实呼吸状态指示点 */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 size-2 rounded-full',
            STATUS_DOT_CLASS[colleague.status] || STATUS_DOT_CLASS.idle,
          )}
          aria-hidden="true"
        />
      </div>

      {/* 中间：Prompt 输入框（h-8 与头像/按钮同高，文本垂直居中有保证） */}
      <div className="flex h-8 flex-1 items-center min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          placeholder={colleague.placeholder}
          className="h-8 w-full bg-transparent px-2 text-xs text-foreground placeholder:text-content-text-muted focus:outline-hidden"
        />
      </div>

      {/* 右侧操作：发送按钮 + 收起按钮 (点击同步关闭上方 AI 面板) */}
      <div className="flex items-center gap-1 shrink-0 pr-0.5">
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onSend}
          disabled={!value.trim()}
          className={cn(
            'flex size-8 items-center justify-center rounded-full transition-all shadow-xs',
            value.trim()
              ? 'bg-foreground text-background hover:bg-foreground/90'
              : 'bg-muted text-content-text-muted cursor-not-allowed',
          )}
          title="发送指令 (Enter)"
        >
          <Send className="size-3.5" />
        </motion.button>

        <button
          type="button"
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full text-content-text-muted hover:bg-accent hover:text-foreground transition-colors"
          title="收起并关闭 (Esc)"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
