import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MemberAvatar } from './member-avatar';
import { MemberChip } from './member-chip';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { useMembers, useMemberSearch } from '../hooks';
import type { Member } from '../types';
import { cn } from '@/lib/utils';

export interface MemberPickerProps {
  value: string[];
  onChange: (memberIds: string[]) => void;
  projectId?: string;
  teamId?: string;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  filterType?: 'human' | 'ai_agent' | 'all';
  showRoles?: boolean;
  excludeMemberIds?: string[];
  emptyText?: string;
}

export function MemberPicker({
  value,
  onChange,
  projectId,
  teamId,
  placeholder = '选择成员...',
  multiple = true,
  disabled = false,
  className,
  filterType = 'all',
  excludeMemberIds = [],
  emptyText = '无匹配成员',
}: MemberPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'human' | 'ai_agent'>(filterType === 'all' ? 'all' : filterType);
  void useRef<HTMLInputElement>(null);

  // For full list
  const { data: fullList, isLoading: loadingFull } = useMembers({
    projectId,
    teamId,
    type: tab === 'all' ? undefined : tab,
    limit: 100,
  });

  // For search
  const { data: searchResults } = useMemberSearch(query, {
    projectId,
    teamId,
    type: tab === 'all' ? undefined : tab,
    limit: 30,
  });

  const items = useMemo(() => {
    const source = query ? searchResults ?? [] : fullList?.items ?? [];
    return source
      .filter((m) => m.status !== 'inactive')
      .filter((m) => !excludeMemberIds.includes(m.id));
  }, [query, searchResults, fullList, excludeMemberIds]);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const selectedMembers = useMemo(() => {
    const all = fullList?.items ?? [];
    return value
      .map((id) => all.find((m) => m.id === id))
      .filter(Boolean) as Member[];
  }, [value, fullList]);

  const toggle = (memberId: string) => {
    if (value.includes(memberId)) {
      onChange(value.filter((id) => id !== memberId));
    } else {
      onChange(multiple ? [...value, memberId] : [memberId]);
      if (!multiple) setOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'w-full min-h-9 flex flex-wrap items-center gap-1 px-2 py-1.5 rounded-md border border-input bg-background text-sm',
              'hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {selectedMembers.length === 0 ? (
              <span className="text-muted-foreground px-1">{placeholder}</span>
            ) : (
              selectedMembers.map((m) => (
                <MemberChip
                  key={m.id}
                  member={m}
                  size="sm"
                  removable={!disabled}
                  onRemove={() => toggle(m.id)}
                />
              ))
            )}
            <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-70 p-0"
          align="start"
        >
          <div className="p-2 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索姓名/handle/邮箱..."
                className="pl-7 h-8 text-sm"
              />
            </div>
            {filterType === 'all' && (
              <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
                <TabsList className="h-7 w-full">
                  <TabsTrigger value="all" className="h-5 text-xs flex-1">
                    全部
                  </TabsTrigger>
                  <TabsTrigger value="human" className="h-5 text-xs flex-1">
                    人类
                  </TabsTrigger>
                  <TabsTrigger value="ai_agent" className="h-5 text-xs flex-1">
                    AI
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {loadingFull && !query ? (
              <div className="text-center text-xs text-muted-foreground py-6">加载中…</div>
            ) : items.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-6">{emptyText}</div>
            ) : (
              items.map((m) => {
                const selected = value.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted text-left text-sm',
                      selected && 'bg-muted',
                    )}
                  >
                    <MemberAvatar
                      member={{
                        type: m.type,
                        displayName: m.displayName,
                        handle: m.handle,
                        avatarUrl: m.avatarUrl,
                        isOnline: m.isOnline,
                      }}
                      size="sm"
                      showBadge={false}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.displayName}</div>
                      <div className="text-10 text-muted-foreground truncate">
                        @{m.handle}
                        {m.user?.username ? ` · ${m.user.username}` : ''}
                        {m.aiModelConfig ? ` · ${m.aiModelConfig.name}` : ''}
                      </div>
                    </div>
                    {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
