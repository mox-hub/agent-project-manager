/**
 * EmojiPicker - 表情选择面板（图3 Linear 风格：搜索 + 常用 + 分类网格）
 *
 * 纯面板组件，由调用方包裹 Popover/AnchoredMenu 触发。
 * 选中时回写 localStorage 常用记录（getFrequentlyUsedEmojis 读取）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  EMOJI_CATEGORIES,
  getFrequentlyUsedEmojis,
  recordFrequentlyUsedEmoji,
  searchEmojis,
} from './emoji-data';

export function EmojiPicker({
  onSelect,
  className,
}: {
  onSelect: (emoji: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  // 常用记录在挂载时读一次 localStorage（面板由 Popover 按需挂载）
  const [frequentlyUsed, setFrequentlyUsed] = useState<string[]>(() =>
    getFrequentlyUsedEmojis(),
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 面板打开时聚焦搜索框
    const timer = window.setTimeout(() => searchRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSelect = (emoji: string) => {
    setFrequentlyUsed(recordFrequentlyUsedEmoji(emoji));
    onSelect(emoji);
  };

  const searchResults = useMemo(() => searchEmojis(query), [query]);

  return (
    <div className={cn('flex w-75 flex-col', className)}>
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('emojiPicker.search')}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      <div className="max-h-70 overflow-y-auto overscroll-contain p-2">
        {query ? (
          searchResults.length > 0 ? (
            <EmojiGrid
              emojis={searchResults}
              onSelect={handleSelect}
            />
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {t('emojiPicker.noResults')}
            </div>
          )
        ) : (
          <>
            {frequentlyUsed.length > 0 && (
              <section className="mb-2">
                <SectionTitle label={t('emojiPicker.frequentlyUsed')} />
                <EmojiGrid
                  emojis={frequentlyUsed.map((emoji) => ({ emoji, name: emoji, keywords: [] }))}
                  onSelect={handleSelect}
                />
              </section>
            )}
            {EMOJI_CATEGORIES.map((category) => (
              <section key={category.id} className="mb-2 last:mb-0">
                <SectionTitle label={t(category.labelKey)} />
                <EmojiGrid emojis={category.emojis} onSelect={handleSelect} />
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <h4 className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">
      {label}
    </h4>
  );
}

function EmojiGrid({
  emojis,
  onSelect,
}: {
  emojis: { emoji: string; name: string }[];
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {emojis.map((item) => (
        <button
          key={item.emoji}
          type="button"
          title={item.name}
          onClick={() => onSelect(item.emoji)}
          className="flex size-8 items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-accent"
        >
          {item.emoji}
        </button>
      ))}
    </div>
  );
}
