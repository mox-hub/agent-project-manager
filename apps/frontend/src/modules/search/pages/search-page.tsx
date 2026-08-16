/**
 * SearchPage - 全局搜索页面
 * 提供统一搜索入口，集成命令面板功能
 */

import { useState } from 'react';
import { Search as SearchIcon, FileText, FolderKanban, CheckSquare, Bot, Settings, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';

interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'document' | 'ai' | 'settings' | 'bug';
  title: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
}

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Mock search results - 实际应用中会从 API 获取
  const mockResults: SearchResult[] = [
    { id: '1', type: 'project', title: 'AgentPM Platform', description: 'AI驱动的项目管理平台', icon: <FolderKanban className="w-4 h-4" />, path: '/app/projects/p1' },
    { id: '2', type: 'task', title: '实现用户认证模块', description: '完成后端 JWT 认证功能', icon: <CheckSquare className="w-4 h-4" />, path: '/app/tasks' },
    { id: '3', type: 'document', title: 'API 认证模块设计', description: '设计文档', icon: <FileText className="w-4 h-4" />, path: '/app/documents' },
    { id: '4', type: 'bug', title: '登录后 Session 立即失效', description: 'Critical severity', icon: <AlertCircle className="w-4 h-4" />, path: '/app/bugs' },
    { id: '5', type: 'ai', title: 'AI 配置设置', description: '配置 AI 提供商和模型', icon: <Bot className="w-4 h-4" />, path: '/app/ai' },
    { id: '6', type: 'settings', title: '系统设置', description: '外观、语言、Git 配置', icon: <Settings className="w-4 h-4" />, path: '/app/settings' },
  ];

  const filteredResults = query.length > 0
    ? mockResults.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.description?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'project': return 'text-accent-blue';
      case 'task': return 'text-accent-green';
      case 'document': return 'text-accent-purple';
      case 'ai': return 'text-amber-500';
      case 'bug': return 'text-accent-red';
      case 'settings': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative max-w-xl mx-auto">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t('shell.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {query.length === 0 ? (
          <div className="text-center py-12">
            <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t('help.searchHint')}</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">未找到匹配结果</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-1">
            {filteredResults.map((result) => (
              <button
                key={result.id}
                onClick={() => navigate(result.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                  'hover:bg-muted/50'
                )}
              >
                <div className={cn('shrink-0', getTypeColor(result.type))}>
                  {result.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{result.title}</p>
                  {result.description && (
                    <p className="text-sm text-muted-foreground truncate">{result.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
