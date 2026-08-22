// Command Input - 命令搜索输入框
import React, { forwardRef, memo } from 'react';
import * as Icons from 'lucide-react';

interface CommandInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const CommandInput = memo(
  forwardRef<HTMLInputElement, CommandInputProps>(function CommandInput(
    { value, onValueChange, placeholder = '输入命令或搜索...', autoFocus = true },
    ref
  ) {
    return (
      <div className="relative flex items-center">
        <Icons.Search className="absolute left-3 h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-12 w-full border-b border-border bg-transparent pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground"
        />
        {value && (
          <button
            type="button"
            onClick={() => onValueChange('')}
            className="absolute right-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Icons.X className="h-4 w-4" />
          </button>
        )}
        {/* AI 触发指示 */}
        {value.startsWith('/ai') && (
          <div className="absolute right-3 flex items-center gap-1 text-xs text-purple-500">
            <Icons.Sparkles className="h-3 w-3" />
            <span>AI</span>
          </div>
        )}
      </div>
    );
  })
);

/**
 * 带快捷键提示的输入框
 */
export function CommandInputWithHint({
  value,
  onValueChange,
  hint,
  ...props
}: CommandInputProps & { hint?: string }) {
  return (
    <div className="relative">
      <CommandInput value={value} onValueChange={onValueChange} {...props} />
      {hint && (
        <div className="absolute bottom-1 right-2 text-10 text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}
