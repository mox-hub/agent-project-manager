/**
 * delivery-page.tsx - 交付视图页面
 *
 * 还原参考: refers/APM/src/app/pages/DeliveryPage.tsx
 * 状态:     DEV ONLY（仅 develop 模式展示，生产不注册路由）
 *
 * 数据：GET /delivery/overview（契约提案 v1，docs/design/api-contract-proposals.md）；
 * dev + VITE_API_MOCK=on 时由 msw handler 提供演示数据，后端实现同路由后自动切真。
 * 仅用于展示 refer 设计还原效果，不接入真实 API。
 * 顶层容器标记 data-mock="true" 便于检索与后续替换。
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ListTree, ChevronRight, ChevronDown, Check, X, Minus, Clock,
  AlertTriangle, Circle, Code2, FlaskConical, Building2,
  ClipboardCheck, Users, Target, Flag, Layers,
  TrendingUp, TrendingDown, Activity, GitPullRequest, Loader,
  SlidersHorizontal, Settings2, Download,
  MessageSquare, Bot, Filter,
  CheckSquare, Square, Sparkles,
  FileSpreadsheet, FileJson, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/card';

// ── Types ──────────────────────────────────────────────────────────────────────

type ViewMode = 'dev' | 'pm' | 'user';
import type {
  AcceptStatus, NodeLevel, StageKey, AgentKey, AgentStatus,
  AcceptanceRecord, AgentRecord, Annotation, DeliveryNode,
} from '../api/delivery-api';
import { useDeliveryOverview } from '../hooks/use-delivery';

// Column config
type ColId =
  | 'progress' | 'testCoverage' | 'bugCount' | 'openPRs'
  | 'riskLevel' | 'reqCoverage' | 'businessValue' | 'feedback'
  | 'claudeCode' | 'cursor' | 'copilot' | 'codex' | 'windsurf'
  | 'unitTest' | 'internalTest' | 'devReview' | 'pmReview' | 'userReview'
  | 'dueDate' | 'owner' | 'annotations';

interface ColDef {
  id: ColId;
  label: string;
  shortLabel?: string;
  group: 'core' | 'dev' | 'pm' | 'user' | 'agent' | 'acceptance' | 'meta';
  width: number;
  defaultVisible: boolean;
  icon?: React.ElementType;
}

const COL_DEFS: ColDef[] = [
  // core
  { id: 'progress',      label: '进度',      group: 'core',       width: 100, defaultVisible: true  },
  // dev
  { id: 'testCoverage',  label: '测试覆盖率', group: 'dev',        width: 72,  defaultVisible: true, icon: Code2      },
  { id: 'bugCount',      label: 'Bugs',      group: 'dev',        width: 56,  defaultVisible: true, icon: AlertTriangle },
  { id: 'openPRs',       label: 'PRs',       group: 'dev',        width: 48,  defaultVisible: true, icon: GitPullRequest },
  // pm
  { id: 'riskLevel',     label: '风险',       group: 'pm',         width: 80,  defaultVisible: true, icon: Activity     },
  { id: 'reqCoverage',   label: '需求对齐',   group: 'pm',         width: 72,  defaultVisible: true  },
  // user
  { id: 'businessValue', label: '业务价值',   group: 'user',       width: 88,  defaultVisible: true  },
  { id: 'feedback',      label: '用户反馈',   group: 'user',       width: 160, defaultVisible: true  },
  // agents
  { id: 'claudeCode',    label: 'Claude Code', shortLabel: 'Claude', group: 'agent', width: 60, defaultVisible: true,  icon: Sparkles  },
  { id: 'cursor',        label: 'Cursor',      shortLabel: 'Cursor', group: 'agent', width: 56, defaultVisible: true,  icon: Bot       },
  { id: 'copilot',       label: 'Copilot',     shortLabel: 'Copilot',group: 'agent', width: 56, defaultVisible: false, icon: Bot       },
  { id: 'codex',         label: 'Codex CLI',   shortLabel: 'Codex',  group: 'agent', width: 56, defaultVisible: false, icon: Code2     },
  { id: 'windsurf',      label: 'Windsurf',    shortLabel: 'Surf',   group: 'agent', width: 56, defaultVisible: false, icon: Bot       },
  // acceptance
  { id: 'unitTest',      label: '单元测试',   shortLabel: 'UT',   group: 'acceptance', width: 56, defaultVisible: true, icon: Code2          },
  { id: 'internalTest',  label: '内部测试',   shortLabel: 'IT',   group: 'acceptance', width: 56, defaultVisible: true, icon: FlaskConical   },
  { id: 'devReview',     label: '开发验收',   shortLabel: 'Dev',  group: 'acceptance', width: 56, defaultVisible: true, icon: Building2      },
  { id: 'pmReview',      label: 'PM验收',     shortLabel: 'PM',   group: 'acceptance', width: 56, defaultVisible: true, icon: ClipboardCheck },
  { id: 'userReview',    label: '用户验收',   shortLabel: 'User', group: 'acceptance', width: 56, defaultVisible: true, icon: Users          },
  // meta
  { id: 'dueDate',       label: '截止日',     group: 'meta',       width: 80,  defaultVisible: true  },
  { id: 'owner',         label: '负责人',     group: 'meta',       width: 90,  defaultVisible: true  },
  { id: 'annotations',   label: '标注',       group: 'meta',       width: 44,  defaultVisible: true, icon: MessageSquare },
];

// ── Status / config ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<AcceptStatus, { label: string; icon: React.ElementType; cell: string; text: string; border: string; bg: string }> = {
  pending:     { label: '待验收', icon: Circle,        cell: 'text-muted-foreground/30', text: 'text-muted-foreground',          border: 'border-border',                              bg: 'bg-muted/40'                        },
  in_progress: { label: '验收中', icon: Loader,        cell: 'text-accent-blue',            text: 'text-accent-blue',     border: 'border-accent-blue/30',       bg: 'bg-accent-blue/10'     },
  passed:      { label: '通过',   icon: Check,         cell: 'text-accent-green',         text: 'text-accent-green',border: 'border-accent-green/30', bg: 'bg-accent-green/10'},
  failed:      { label: '未通过', icon: X,             cell: 'text-destructive',             text: 'text-destructive',       border: 'border-destructive/30',          bg: 'bg-destructive/10'       },
  waived:      { label: '豁免',   icon: Minus,         cell: 'text-accent-yellow',           text: 'text-accent-yellow',   border: 'border-accent-yellow/30',      bg: 'bg-accent-yellow/10'   },
  blocked:     { label: '阻塞',   icon: AlertTriangle, cell: 'text-accent-orange',          text: 'text-accent-orange', border: 'border-accent-orange/40',    bg: 'bg-accent-orange/10' },
};
const ALL_STATUSES: AcceptStatus[] = ['pending', 'in_progress', 'passed', 'failed', 'waived', 'blocked'];

const AGENT_CFG: Record<AgentKey, { label: string; color: string; icon: React.ElementType }> = {
  claudeCode: { label: 'Claude Code', color: 'text-accent-purple', icon: Sparkles     },
  cursor:     { label: 'Cursor',      color: 'text-accent-blue',   icon: Bot          },
  copilot:    { label: 'Copilot',     color: 'text-muted-foreground',  icon: Bot          },
  codex:      { label: 'Codex CLI',   color: 'text-accent-green',icon: Code2        },
  windsurf:   { label: 'Windsurf',    color: 'text-accent-blue',   icon: Bot          },
};

const AGENT_STATUS_CFG: Record<AgentStatus, { label: string; icon: React.ElementType; cls: string }> = {
  active:      { label: '活跃',  icon: Activity,  cls: 'text-accent-green' },
  idle:        { label: '待机',  icon: Minus,     cls: 'text-muted-foreground/40' },
  contributed: { label: '已贡献',icon: Check,     cls: 'text-accent-blue'   },
  not_used:    { label: '未使用',icon: Circle,    cls: 'text-muted-foreground/20' },
};

const STAGE_KEYS: StageKey[] = ['unitTest', 'internalTest', 'devReview', 'pmReview', 'userReview'];
const AGENT_KEYS: AgentKey[]  = ['claudeCode', 'cursor', 'copilot', 'codex', 'windsurf'];

const STAGE_PRIMARY: Record<StageKey, ViewMode[]> = {
  unitTest:     ['dev'],
  internalTest: ['dev', 'pm'],
  devReview:    ['dev', 'pm'],
  pmReview:     ['pm', 'user'],
  userReview:   ['user'],
};

const RISK_CFG = {
  low:    { label: '低风险', icon: TrendingDown, color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/30' },
  medium: { label: '中风险', icon: Activity,     color: 'text-accent-yellow',   bg: 'bg-accent-yellow/10',    border: 'border-accent-yellow/30'     },
  high:   { label: '高风险', icon: TrendingUp,   color: 'text-destructive',     bg: 'bg-destructive/10',        border: 'border-destructive/30'          },
};
const BV_CFG = {
  low:    { label: '低', stars: 1, color: 'text-muted-foreground',  bg: 'bg-muted-foreground/40'  },
  medium: { label: '中', stars: 2, color: 'text-accent-blue',   bg: 'bg-accent-blue'   },
  high:   { label: '高', stars: 3, color: 'text-accent-yellow',  bg: 'bg-accent-yellow'  },
};
const ANN_TAG_CFG = {
  note:       { label: '备注',   color: 'bg-muted-foreground/60',   text: 'text-muted-foreground'  },
  negotiated: { label: '已协商', color: 'bg-accent-blue',    text: 'text-accent-blue'    },
  blocker:    { label: '阻塞',   color: 'bg-destructive',     text: 'text-destructive'      },
  decision:   { label: '决策',   color: 'bg-accent-purple',  text: 'text-accent-purple'},
};

// ⚠️ MOCK DATA ──────────────────────────────────────────────────────────────────
// 以下为静态示例数据，仅用于展示 refer 设计还原效果，不接入真实 API。



// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenNodes(nodes: DeliveryNode[]): DeliveryNode[] {
  return nodes.flatMap(n => [n, ...(n.children ? flattenNodes(n.children) : [])]);
}

function initAcceptance(nodes: DeliveryNode[]): Record<string, AcceptanceRecord> {
  const rec: Record<string, AcceptanceRecord> = {};
  flattenNodes(nodes).forEach(n => { rec[n.id] = { ...n.acceptance }; });
  return rec;
}

// ── AcceptCell ─────────────────────────────────────────────────────────────────

function AcceptCell({ status, isPrimary, onSelect }: { status: AcceptStatus; isPrimary: boolean; onSelect: (s: AcceptStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center justify-center h-full">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn('w-full h-full flex items-center justify-center rounded transition-colors hover:bg-accent/60', isPrimary ? cfg.cell : 'text-muted-foreground/20')}
        title={cfg.label}
        data-ai-action="delivery.acceptance-cell.toggle"
      >
        <Icon className={cn('w-3.5 h-3.5', isPrimary && status === 'in_progress' && 'animate-spin')}
          style={status === 'in_progress' ? { animationDuration: '2s' } : undefined} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1 min-w-30">
          {ALL_STATUSES.map(s => {
            const c = STATUS_CFG[s]; const SIcon = c.icon;
            return (
              <button key={s} onClick={() => { onSelect(s); setOpen(false); }}
                className={cn('flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors', s === status && 'bg-accent')}>
                <SIcon className={cn('w-3 h-3', c.cell)} /><span>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AgentCell ─────────────────────────────────────────────────────────────────

function AgentCell({ agentKey, status }: { agentKey: AgentKey; status: AgentStatus }) {
  const aCfg = AGENT_CFG[agentKey];
  const sCfg = AGENT_STATUS_CFG[status];
  const Icon = sCfg.icon;
  return (
    <div className="flex items-center justify-center h-full" title={`${aCfg.label}: ${sCfg.label}`}>
      <Icon className={cn('w-3.5 h-3.5', sCfg.cls)} />
    </div>
  );
}

// ── Annotation panel ──────────────────────────────────────────────────────────

function AnnotationPanel({
  nodeId, nodeTitle, annotations, onAdd, onClose,
}: {
  nodeId: string; nodeTitle: string;
  annotations: Annotation[];
  onAdd: (ann: Omit<Annotation, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<Annotation['tag']>('note');
  const ref = useRef<HTMLDivElement>(null);
  const nodeAnns = annotations.filter(a => a.nodeId === nodeId);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-50 w-72 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <p className="text-xs font-semibold truncate max-w-45">{nodeTitle}</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-ai-action="delivery.annotation.close">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Existing annotations */}
      {nodeAnns.length > 0 && (
        <div className="max-h-36 overflow-y-auto divide-y divide-border">
          {nodeAnns.map(ann => {
            const tc = ANN_TAG_CFG[ann.tag];
            return (
              <div key={ann.id} className="px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tc.color)} />
                  <span className={cn('text-10 font-medium', tc.text)}>{tc.label}</span>
                  <span className="text-10 text-muted-foreground/50 ml-auto">{ann.author} · {ann.timestamp}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{ann.content}</p>
              </div>
            );
          })}
        </div>
      )}
      {nodeAnns.length === 0 && (
        <p className="text-xs text-muted-foreground/50 text-center py-3">暂无标注</p>
      )}

      {/* Add new */}
      <div className="p-3 border-t border-border bg-muted/10">
        <div className="flex items-center gap-1.5 mb-2">
          {(Object.keys(ANN_TAG_CFG) as Annotation['tag'][]).map(t => {
            const tc = ANN_TAG_CFG[t];
            return (
              <button key={t} onClick={() => setTag(t)}
                className={cn('text-10 px-2 py-0.5 rounded-full border transition-colors font-medium',
                  tag === t ? cn(tc.text, tc.color.replace('bg-', 'bg-').replace('500', '100/20')) : 'border-border text-muted-foreground hover:border-border')}>
                {tc.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="添加标注..."
          rows={2}
          className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 resize-none focus:outline-hidden focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
        />
        <button
          disabled={!content.trim()}
          onClick={() => {
            if (!content.trim()) return;
            onAdd({ nodeId, author: 'You', content: content.trim(), tag });
            setContent('');
          }}
          className="w-full mt-1.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 transition-opacity"
          data-ai-action="delivery.annotation.add"
        >
          添加标注
        </button>
      </div>
    </div>
  );
}

// ── Column picker panel ───────────────────────────────────────────────────────

const GROUP_LABELS: Record<ColDef['group'], string> = {
  core:       '基础信息',
  dev:        '开发指标',
  pm:         'PM指标',
  user:       '用户视角',
  agent:      'AI Agent',
  acceptance: '验收阶段',
  meta:       '元信息',
};

function ColumnPicker({
  visibleCols, onToggle, onClose,
}: { visibleCols: Set<ColId>; onToggle: (id: ColId) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const groups = Array.from(new Set(COL_DEFS.map(c => c.group)));

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-64 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30">
        <p className="text-xs font-semibold">显示列配置</p>
        <button onClick={onClose} data-ai-action="delivery.col-picker.close"><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
      </div>
      <div className="max-h-80 overflow-y-auto p-2">
        {groups.map(group => {
          const cols = COL_DEFS.filter(c => c.group === group);
          return (
            <div key={group} className="mb-3">
              <p className="text-10 font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">{GROUP_LABELS[group]}</p>
              {cols.map(col => {
                const visible = visibleCols.has(col.id);
                return (
                  <button key={col.id} onClick={() => onToggle(col.id)}
                    className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-accent transition-colors text-xs"
                    data-ai-action="delivery.col-picker.toggle">
                    {visible ? <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" /> : <Square className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                    <span className={visible ? 'text-foreground' : 'text-muted-foreground'}>{col.label}</span>
                    <span className="ml-auto text-10 text-muted-foreground/40">{col.width}px</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-border bg-muted/10 flex gap-2">
        <button onClick={() => COL_DEFS.forEach(c => !visibleCols.has(c.id) && onToggle(c.id))}
          className="text-11 text-primary hover:underline">全选</button>
        <button onClick={() => COL_DEFS.forEach(c => visibleCols.has(c.id) && onToggle(c.id))}
          className="text-11 text-muted-foreground hover:text-foreground hover:underline">清空</button>
      </div>
    </div>
  );
}

// ── View config panel ─────────────────────────────────────────────────────────

function ViewConfigPanel({
  data, hiddenNodes, onToggleNode, onClose,
}: {
  data: DeliveryNode[];
  hiddenNodes: Set<string>;
  onToggleNode: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-72 bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30">
        <p className="text-xs font-semibold flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" />视图配置</p>
        <button onClick={onClose} data-ai-action="delivery.view-config.close"><X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
      </div>
      <p className="text-10 text-muted-foreground px-3 pt-2 pb-1">选择显示的项目和里程碑</p>
      <div className="max-h-64 overflow-y-auto px-2 pb-2">
        {data.map(project => (
          <div key={project.id}>
            <button onClick={() => onToggleNode(project.id)}
              className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-accent transition-colors text-xs group"
              data-ai-action="delivery.view-config.toggle">
              {!hiddenNodes.has(project.id)
                ? <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                : <Square className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
              <Target className="w-3 h-3 text-primary shrink-0" />
              <span className="font-medium truncate">{project.title}</span>
            </button>
            {project.children?.map(ms => (
              <button key={ms.id} onClick={() => onToggleNode(ms.id)}
                className="flex items-center gap-2.5 w-full pl-7 pr-2 py-1.5 rounded-lg hover:bg-accent transition-colors text-xs"
                data-ai-action="delivery.view-config.toggle">
                {!hiddenNodes.has(ms.id)
                  ? <CheckSquare className="w-3.5 h-3.5 text-accent-purple shrink-0" />
                  : <Square className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                <Flag className="w-3 h-3 text-accent-purple shrink-0" />
                <span className="truncate text-muted-foreground">{ms.title}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Export panel ──────────────────────────────────────────────────────────────

function ExportMenu({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const options = [
    { label: '导出为 Excel (.xlsx)', icon: FileSpreadsheet, fn: () => { toast.info('Excel 导出功能开发中，敬请期待'); onClose(); } },
    { label: '导出为 CSV (.csv)',    icon: FileSpreadsheet, fn: () => { toast.info('CSV 导出功能开发中，敬请期待'); onClose(); } },
    { label: '导出为 JSON (.json)',  icon: FileJson,        fn: () => { toast.info('JSON 导出功能开发中，敬请期待'); onClose(); } },
    { label: '复制为 Markdown',      icon: Copy,            fn: () => { toast.success('Markdown 已复制到剪贴板'); onClose(); } },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 z-50 w-52 bg-popover border border-border rounded-xl shadow-xl py-1">
      <p className="text-10 font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">导出选项</p>
      {options.map(opt => {
        const Icon = opt.icon;
        return (
          <button key={opt.label} onClick={opt.fn}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-accent transition-colors"
            data-ai-action="delivery.export.select">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />{opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  const color = value === 100 ? 'bg-accent-green' : value >= 60 ? 'bg-accent-blue' : value >= 30 ? 'bg-accent-yellow' : 'bg-destructive';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-10 tabular-nums text-muted-foreground w-7 text-right">{value}%</span>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

const LEVEL_INDENT: Record<NodeLevel, number> = { project: 0, milestone: 20, feature: 40 };
const LEVEL_ICON:   Record<NodeLevel, React.ElementType> = { project: Target, milestone: Flag, feature: Layers };
const LEVEL_STYLE:  Record<NodeLevel, string> = {
  project:   'font-semibold text-sm bg-muted/30',
  milestone: 'font-medium text-xs',
  feature:   'text-xs',
};

function TableRow({
  node, viewMode, expanded, onToggle, acceptance, onAcceptChange,
  annotations, onAnnotationAdd, visibleCols,
}: {
  node: DeliveryNode; viewMode: ViewMode;
  expanded: boolean; onToggle: () => void;
  acceptance: AcceptanceRecord; onAcceptChange: (key: StageKey, status: AcceptStatus) => void;
  annotations: Annotation[]; onAnnotationAdd: (ann: Omit<Annotation, 'id' | 'timestamp'>) => void;
  visibleCols: Set<ColId>;
}) {
  const [annOpen, setAnnOpen] = useState(false);
  const indent = LEVEL_INDENT[node.level];
  const LevelIcon = LEVEL_ICON[node.level];
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isOverdue = new Date(node.dueDate) < new Date() && node.progress < 100;
  const nodeAnns = annotations.filter(a => a.nodeId === node.id);

  const vis = (id: ColId) => visibleCols.has(id);
  const colW = (id: ColId) => COL_DEFS.find(c => c.id === id)!.width;

  return (
    <div className={cn('flex items-center min-h-9 border-b border-border/50 hover:bg-accent/20 transition-colors group', LEVEL_STYLE[node.level])}>
      {/* ── Sticky first column ── */}
      <div
        className="sticky left-0 z-10 bg-inherit flex items-center gap-1.5 shrink-0 px-3 py-1.5 border-r border-border/40"
        style={{ width: 260, minWidth: 260, paddingLeft: 12 + indent }}
      >
        <button onClick={onToggle}
          className={cn('w-4 h-4 flex items-center justify-center rounded text-muted-foreground shrink-0 transition-colors',
            hasChildren ? 'hover:bg-accent hover:text-foreground' : 'opacity-0 pointer-events-none')}
          data-ai-action="delivery.node.toggle">
          {hasChildren && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
        </button>
        <LevelIcon className={cn('w-3.5 h-3.5 shrink-0',
          node.level === 'project' ? 'text-primary' : node.level === 'milestone' ? 'text-accent-purple' : 'text-muted-foreground/60')} />
        <span className="truncate">{node.title}</span>
      </div>

      {/* ── Progress ── */}
      {vis('progress') && (
        <div style={{ width: colW('progress'), minWidth: colW('progress') }} className="shrink-0 px-2">
          <ProgressBar value={node.progress} />
        </div>
      )}

      {/* ── Dev cols ── */}
      {vis('testCoverage') && (
        <div style={{ width: colW('testCoverage'), minWidth: colW('testCoverage') }} className="shrink-0 flex items-center justify-center">
          {node.testCoverage != null
            ? <span className={cn('text-xs font-mono font-medium', node.testCoverage >= 80 ? 'text-accent-green' : node.testCoverage >= 60 ? 'text-accent-yellow' : 'text-destructive')}>{node.testCoverage}%</span>
            : <span className="text-10 text-muted-foreground/30">—</span>}
        </div>
      )}
      {vis('bugCount') && (
        <div style={{ width: colW('bugCount'), minWidth: colW('bugCount') }} className="shrink-0 flex items-center justify-center">
          {(node.bugCount ?? 0) > 0
            ? <span className="inline-flex items-center gap-1 text-10 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30 font-medium"><AlertTriangle className="w-2.5 h-2.5" />{node.bugCount}</span>
            : <span className="text-10 text-muted-foreground/30">—</span>}
        </div>
      )}
      {vis('openPRs') && (
        <div style={{ width: colW('openPRs'), minWidth: colW('openPRs') }} className="shrink-0 flex items-center justify-center">
          {(node.openPRs ?? 0) > 0
            ? <span className="inline-flex items-center gap-1 text-10 text-accent-blue font-medium"><GitPullRequest className="w-2.5 h-2.5" />{node.openPRs}</span>
            : <span className="text-10 text-muted-foreground/30">—</span>}
        </div>
      )}

      {/* ── PM cols ── */}
      {vis('riskLevel') && (
        <div style={{ width: colW('riskLevel'), minWidth: colW('riskLevel') }} className="shrink-0 flex items-center justify-center">
          {node.riskLevel ? (() => { const rc = RISK_CFG[node.riskLevel!]; const RI = rc.icon; return (
            <span className={cn('inline-flex items-center gap-1 text-10 px-1.5 py-0.5 rounded-full border font-medium', rc.bg, rc.color, rc.border)}>
              <RI className="w-2.5 h-2.5" />{rc.label}
            </span>); })() : <span className="text-10 text-muted-foreground/30">—</span>}
        </div>
      )}
      {vis('reqCoverage') && (
        <div style={{ width: colW('reqCoverage'), minWidth: colW('reqCoverage') }} className="shrink-0 flex items-center justify-center">
          {node.reqCoverage != null
            ? <span className={cn('text-xs font-mono font-medium', node.reqCoverage >= 90 ? 'text-accent-green' : node.reqCoverage >= 70 ? 'text-accent-yellow' : 'text-destructive')}>{node.reqCoverage}%</span>
            : <span className="text-10 text-muted-foreground/30">—</span>}
        </div>
      )}

      {/* ── User cols ── */}
      {vis('businessValue') && (
        <div style={{ width: colW('businessValue'), minWidth: colW('businessValue') }} className="shrink-0 flex items-center justify-center">
          {node.businessValue ? (() => { const bc = BV_CFG[node.businessValue!]; return (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={cn('w-2 h-2 rounded-sm', i < bc.stars ? bc.bg : 'bg-muted')} />
              ))}
              <span className={cn('text-10 ml-1 font-medium', bc.color)}>{bc.label}</span>
            </div>); })() : <span className="text-10 text-muted-foreground/30">—</span>}
        </div>
      )}
      {vis('feedback') && (
        <div style={{ width: colW('feedback'), minWidth: colW('feedback') }} className="shrink-0 overflow-hidden px-2">
          {node.feedback
            ? <p className="text-11 text-muted-foreground truncate" title={node.feedback}>{node.feedback}</p>
            : <span className="text-10 text-muted-foreground/30">暂无反馈</span>}
        </div>
      )}

      {/* ── Agent cols ── */}
      {AGENT_KEYS.map(ak => vis(ak as ColId) && (
        <div key={ak} style={{ width: colW(ak as ColId), minWidth: colW(ak as ColId) }} className="shrink-0 border-l border-border/20 h-full flex items-center">
          <AgentCell agentKey={ak} status={node.agents[ak]} />
        </div>
      ))}

      {/* ── Acceptance stage cells ── */}
      {STAGE_KEYS.map(sk => vis(sk as ColId) && (
        <div key={sk} style={{ width: colW(sk as ColId), minWidth: colW(sk as ColId) }} className="shrink-0 h-full flex items-center border-l border-border/30">
          <AcceptCell
            status={acceptance[sk]}
            isPrimary={(STAGE_PRIMARY[sk] as ViewMode[]).includes(viewMode)}
            onSelect={(s) => onAcceptChange(sk, s)}
          />
        </div>
      ))}

      {/* ── Due date ── */}
      {vis('dueDate') && (
        <div style={{ width: colW('dueDate'), minWidth: colW('dueDate') }} className="shrink-0 px-2 border-l border-border/30">
          <div className={cn('flex items-center gap-1 text-11 whitespace-nowrap', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
            <Clock className="w-3 h-3 shrink-0" />
            {new Date(node.dueDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
          </div>
        </div>
      )}

      {/* ── Owner ── */}
      {vis('owner') && (
        <div style={{ width: colW('owner'), minWidth: colW('owner') }} className="shrink-0 px-2 text-11 text-muted-foreground truncate border-l border-border/30">
          {node.owner}
        </div>
      )}

      {/* ── Annotations ── */}
      {vis('annotations') && (
        <div style={{ width: colW('annotations'), minWidth: colW('annotations') }} className="shrink-0 border-l border-border/30 relative">
          <button onClick={() => setAnnOpen(v => !v)}
            className={cn('w-full h-full flex items-center justify-center py-2 hover:bg-accent/60 transition-colors relative',
              nodeAnns.length > 0 ? 'text-accent-yellow' : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100')}
            data-ai-action="delivery.annotation.open">
            <MessageSquare className="w-3.5 h-3.5" />
            {nodeAnns.length > 0 && (
              <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-accent-yellow text-10 text-white flex items-center justify-center font-bold leading-none">
                {nodeAnns.length}
              </span>
            )}
          </button>
          {annOpen && (
            <AnnotationPanel
              nodeId={node.id} nodeTitle={node.title}
              annotations={annotations} onAdd={onAnnotationAdd}
              onClose={() => setAnnOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Table header ──────────────────────────────────────────────────────────────

function TableHeader({ viewMode, visibleCols }: { viewMode: ViewMode; visibleCols: Set<ColId> }) {
  const vis = (id: ColId) => visibleCols.has(id);
  const colW = (id: ColId) => COL_DEFS.find(c => c.id === id)!.width;

  return (
    <div className="flex items-center h-9 bg-muted/50 border-b border-border text-10 font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 z-20">
      <div className="sticky left-0 z-20 bg-muted/50 flex items-center px-3 border-r border-border/40 shrink-0" style={{ width: 260, minWidth: 260 }}>
        交付项目
      </div>
      {vis('progress')      && <div style={{ width: colW('progress'), minWidth: colW('progress') }} className="shrink-0 px-2">进度</div>}
      {vis('testCoverage')  && <div style={{ width: colW('testCoverage'), minWidth: colW('testCoverage') }} className="shrink-0 flex items-center justify-center px-1">覆盖率</div>}
      {vis('bugCount')      && <div style={{ width: colW('bugCount'), minWidth: colW('bugCount') }} className="shrink-0 flex items-center justify-center px-1">Bugs</div>}
      {vis('openPRs')       && <div style={{ width: colW('openPRs'), minWidth: colW('openPRs') }} className="shrink-0 flex items-center justify-center px-1">PRs</div>}
      {vis('riskLevel')     && <div style={{ width: colW('riskLevel'), minWidth: colW('riskLevel') }} className="shrink-0 flex items-center justify-center px-1">风险</div>}
      {vis('reqCoverage')   && <div style={{ width: colW('reqCoverage'), minWidth: colW('reqCoverage') }} className="shrink-0 flex items-center justify-center px-1">需求对齐</div>}
      {vis('businessValue') && <div style={{ width: colW('businessValue'), minWidth: colW('businessValue') }} className="shrink-0 flex items-center justify-center px-1">业务价值</div>}
      {vis('feedback')      && <div style={{ width: colW('feedback'), minWidth: colW('feedback') }} className="shrink-0 px-2">用户反馈</div>}
      {/* Agent cols */}
      {AGENT_KEYS.map(ak => vis(ak as ColId) && (
        <div key={ak} style={{ width: colW(ak as ColId), minWidth: colW(ak as ColId) }} className="shrink-0 flex flex-col items-center justify-center border-l border-border/30 gap-0.5 h-full px-1">
          {(() => { const ac = AGENT_CFG[ak]; const AI = ac.icon; return (<><AI className={cn('w-3 h-3', ac.color)} /><span className="text-10">{COL_DEFS.find(c => c.id === ak)?.shortLabel}</span></>); })()}
        </div>
      ))}
      {/* Stage cols */}
      {STAGE_KEYS.map(sk => vis(sk as ColId) && (() => {
        const col = COL_DEFS.find(c => c.id === sk)!;
        const Icon = col.icon!;
        const isPrimary = (STAGE_PRIMARY[sk] as ViewMode[]).includes(viewMode);
        return (
          <div key={sk} style={{ width: colW(sk as ColId), minWidth: colW(sk as ColId) }} className={cn('flex flex-col items-center justify-center border-l border-border/30 shrink-0 h-full gap-0.5 px-1', !isPrimary && 'opacity-40')}>
            <Icon className="w-3 h-3" /><span className="text-10">{col.shortLabel}</span>
          </div>
        );
      })())}
      {vis('dueDate')      && <div style={{ width: colW('dueDate'), minWidth: colW('dueDate') }} className="shrink-0 px-2 border-l border-border/30">截止日</div>}
      {vis('owner')        && <div style={{ width: colW('owner'), minWidth: colW('owner') }} className="shrink-0 px-2 border-l border-border/30">负责人</div>}
      {vis('annotations')  && <div style={{ width: colW('annotations'), minWidth: colW('annotations') }} className="shrink-0 border-l border-border/30 flex items-center justify-center"><MessageSquare className="w-3 h-3" /></div>}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function LegendBar() {
  return (
    <div className="flex items-center gap-5 px-4 py-1.5 bg-muted/20 border-b border-border text-10 text-muted-foreground">
      <span className="font-semibold">验收：</span>
      {ALL_STATUSES.map(s => { const c = STATUS_CFG[s]; const Icon = c.icon; return (
        <span key={s} className="flex items-center gap-1"><Icon className={cn('w-3 h-3', c.cell)} />{c.label}</span>
      ); })}
      <span className="ml-2 font-semibold">Agent：</span>
      {Object.entries(AGENT_STATUS_CFG).map(([k, v]) => { const Icon = v.icon; return (
        <span key={k} className="flex items-center gap-1"><Icon className={cn('w-3 h-3', v.cls)} />{v.label}</span>
      ); })}
      <span className="ml-auto text-muted-foreground/40">点击格子修改状态 · 点击💬添加标注</span>
    </div>
  );
}

// ── Summary stats ─────────────────────────────────────────────────────────────

function SummaryBar({ data, viewMode }: { data: DeliveryNode[]; viewMode: ViewMode }) {
  const features = flattenNodes(data).filter(n => n.level === 'feature');
  const stageStats = STAGE_KEYS.map(k => {
    const col = COL_DEFS.find(c => c.id === k)!;
    return { key: k, label: col.shortLabel ?? col.label, passed: features.filter(n => n.acceptance[k] === 'passed').length, total: features.length, primary: (STAGE_PRIMARY[k] as ViewMode[]).includes(viewMode), Icon: col.icon! };
  });
  const agentStats = AGENT_KEYS.map(ak => {
    const active = features.filter(n => n.agents[ak] === 'active' || n.agents[ak] === 'contributed').length;
    return { key: ak, label: COL_DEFS.find(c => c.id === ak)?.shortLabel ?? ak, active, total: features.length };
  });

  return (
    <div className="flex items-center gap-5 px-5 py-2 border-b border-border bg-background shrink-0 overflow-x-auto">
      <div className="flex items-center gap-5 shrink-0">
        {stageStats.map(s => {
          const pct = s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0;
          return (
            <div key={s.key} className={cn('flex items-center gap-2', !s.primary && 'opacity-40')}>
              <s.Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-10 text-muted-foreground">{s.label}</span>
                  <span className={cn('text-11 font-semibold tabular-nums', pct === 100 ? 'text-accent-green' : pct >= 60 ? 'text-accent-blue' : 'text-muted-foreground')}>{s.passed}/{s.total}</span>
                </div>
                <div className="w-14 h-1 rounded-full bg-muted overflow-hidden mt-0.5">
                  <div className={cn('h-full rounded-full', pct === 100 ? 'bg-accent-green' : pct >= 60 ? 'bg-accent-blue' : 'bg-muted-foreground/40')} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="w-px h-6 bg-border shrink-0" />
      <div className="flex items-center gap-4 shrink-0">
        <span className="text-10 text-muted-foreground font-semibold">Agent活跃度</span>
        {agentStats.map(a => {
          const ac = AGENT_CFG[a.key as AgentKey];
          return (
            <div key={a.key} className="flex items-center gap-1">
              <span className={cn('text-10 font-medium', ac.color)}>{a.label}</span>
              <span className="text-10 text-muted-foreground">{a.active}/{a.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Recursive node list ───────────────────────────────────────────────────────

function NodeList({
  nodes, viewMode, expanded, onToggle, acceptance, onAcceptChange,
  annotations, onAnnotationAdd, visibleCols, hiddenNodes,
}: {
  nodes: DeliveryNode[]; viewMode: ViewMode;
  expanded: Set<string>; onToggle: (id: string) => void;
  acceptance: Record<string, AcceptanceRecord>;
  onAcceptChange: (nodeId: string, key: StageKey, status: AcceptStatus) => void;
  annotations: Annotation[]; onAnnotationAdd: (ann: Omit<Annotation, 'id' | 'timestamp'>) => void;
  visibleCols: Set<ColId>; hiddenNodes: Set<string>;
}) {
  return (
    <>
      {nodes.filter(n => !hiddenNodes.has(n.id)).map(node => (
        <div key={node.id}>
          <TableRow
            node={node} viewMode={viewMode}
            expanded={expanded.has(node.id)} onToggle={() => onToggle(node.id)}
            acceptance={acceptance[node.id] ?? node.acceptance}
            onAcceptChange={(key, status) => onAcceptChange(node.id, key, status)}
            annotations={annotations} onAnnotationAdd={onAnnotationAdd}
            visibleCols={visibleCols}
          />
          {node.children && expanded.has(node.id) && (
            <NodeList
              nodes={node.children} viewMode={viewMode}
              expanded={expanded} onToggle={onToggle}
              acceptance={acceptance} onAcceptChange={onAcceptChange}
              annotations={annotations} onAnnotationAdd={onAnnotationAdd}
              visibleCols={visibleCols} hiddenNodes={hiddenNodes}
            />
          )}
        </div>
      ))}
    </>
  );
}

// ── View mode config ──────────────────────────────────────────────────────────

const VIEW_CONFIG: Record<ViewMode, { label: string; icon: React.ElementType; desc: string; color: string }> = {
  dev:  { label: '开发团队', icon: Code2,          desc: '关注技术质量、测试覆盖与代码审查',   color: 'text-accent-blue bg-accent-blue/10 border-accent-blue/30'       },
  pm:   { label: '项目经理', icon: ClipboardCheck, desc: '关注交付进度、风险管理与需求对齐',   color: 'text-accent-purple bg-accent-purple/10 border-accent-purple/40' },
  user: { label: '用户经理', icon: Users,          desc: '关注业务价值、用户体验与最终验收',   color: 'text-accent-green bg-accent-green/10 border-accent-green/30' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export function DeliveryPage() {
  const { data: overview, isLoading } = useDeliveryOverview();
  const DELIVERY_DATA = overview?.nodes ?? [];
  const [viewMode, setViewMode]       = useState<ViewMode>('dev');
  const [expanded, setExpanded]       = useState<Set<string>>(new Set(['p1', 'p2', 'm1', 'm2', 'm4']));
  const [acceptance, setAcceptance]   = useState<Record<string, AcceptanceRecord>>({});

  // 数据到达/变化后重置验收矩阵（原为静态数据一次性初始化）
  useEffect(() => {
    if (DELIVERY_DATA.length > 0) setAcceptance(initAcceptance(DELIVERY_DATA));
  }, [overview]);
  const [annotations, setAnnotations] = useState<Annotation[]>([
    { id: 'a1', nodeId: 'f11', author: 'Maria', content: '已与用户确认，Webhook延迟问题在2周内修复，用户表示可接受临时状态', tag: 'negotiated', timestamp: '08-01 14:30' },
    { id: 'a2', nodeId: 'f10', author: 'Ben', content: '3D Secure 目前仅支持欧区，国内暂时豁免该验收项', tag: 'decision', timestamp: '08-03 09:15' },
  ]);
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(() =>
    new Set(COL_DEFS.filter(c => c.defaultVisible).map(c => c.id))
  );
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [colPickerOpen, setColPickerOpen]     = useState(false);
  const [viewConfigOpen, setViewConfigOpen]   = useState(false);
  const [exportMenuOpen, setExportMenuOpen]   = useState(false);

  const vcfg = VIEW_CONFIG[viewMode];
  const VIcon = vcfg.icon;

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }, []);

  const handleAcceptChange = useCallback((nodeId: string, key: StageKey, status: AcceptStatus) => {
    setAcceptance(prev => ({ ...prev, [nodeId]: { ...prev[nodeId], [key]: status } }));
    const node = flattenNodes(DELIVERY_DATA).find(n => n.id === nodeId);
    toast.success(`${node?.title ?? nodeId} · ${COL_DEFS.find(c => c.id === key)?.label} → ${STATUS_CFG[status].label}`);
  }, []);

  const handleAnnotationAdd = useCallback((ann: Omit<Annotation, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timestamp = `${now.getMonth() + 1}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setAnnotations(prev => [...prev, { ...ann, id: `a${Date.now()}`, timestamp }]);
    toast.success('标注已添加');
  }, []);

  const toggleCol = useCallback((id: ColId) => {
    setVisibleCols(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }, []);

  const toggleNode = useCallback((id: string) => {
    setHiddenNodes(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background" data-mock="true" data-ai-page="delivery.delivery.main">
      {/* ── Page header ── */}
      <div className="px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-sm font-semibold flex items-center gap-2">
                <ListTree className="w-4 h-4 text-primary" />交付视图
              </h1>
              <p className="text-11 text-muted-foreground mt-0.5">项目目标 → 里程碑 → 功能点 的层级验收追踪</p>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border shrink-0">
            {(Object.keys(VIEW_CONFIG) as ViewMode[]).map(vm => {
              const cfg = VIEW_CONFIG[vm]; const Icon = cfg.icon; const active = vm === viewMode;
              return (
                <button key={vm} onClick={() => setViewMode(vm)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    active ? cn('border shadow-xs', cfg.color) : 'text-muted-foreground hover:text-foreground hover:bg-accent')}
                  data-ai-action="delivery.view-mode.switch">
                  <Icon className="w-3.5 h-3.5" />{cfg.label}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Column picker */}
            <div className="relative">
              <button onClick={() => { setColPickerOpen(v => !v); setViewConfigOpen(false); setExportMenuOpen(false); }}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors',
                  colPickerOpen ? 'bg-accent border-border text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent')}
                data-ai-action="delivery.col-picker.open">
                <SlidersHorizontal className="w-3.5 h-3.5" />列配置
              </button>
              {colPickerOpen && <ColumnPicker visibleCols={visibleCols} onToggle={toggleCol} onClose={() => setColPickerOpen(false)} />}
            </div>

            {/* View config */}
            <div className="relative">
              <button onClick={() => { setViewConfigOpen(v => !v); setColPickerOpen(false); setExportMenuOpen(false); }}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors',
                  viewConfigOpen ? 'bg-accent border-border text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent')}
                data-ai-action="delivery.view-config.open">
                <Filter className="w-3.5 h-3.5" />视图配置
                {hiddenNodes.size > 0 && <span className="ml-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-10 flex items-center justify-center font-bold">{hiddenNodes.size}</span>}
              </button>
              {viewConfigOpen && <ViewConfigPanel data={DELIVERY_DATA} hiddenNodes={hiddenNodes} onToggleNode={toggleNode} onClose={() => setViewConfigOpen(false)} />}
            </div>

            {/* Export */}
            <div className="relative">
              <button onClick={() => { setExportMenuOpen(v => !v); setColPickerOpen(false); setViewConfigOpen(false); }}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors',
                  exportMenuOpen ? 'bg-accent border-border text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent')}
                data-ai-action="delivery.export.open">
                <Download className="w-3.5 h-3.5" />导出
              </button>
              {exportMenuOpen && <ExportMenu onClose={() => setExportMenuOpen(false)} />}
            </div>
          </div>
        </div>

        {/* Current view pill */}
        <div className={cn('mt-2.5 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border w-fit', vcfg.color)}>
          <VIcon className="w-3.5 h-3.5" />{vcfg.desc}
          <span className="text-muted-foreground/50 ml-1">· 加亮验收列为本视角主要环节</span>
        </div>
      </div>

      {/* Summary */}
      <SummaryBar data={DELIVERY_DATA} viewMode={viewMode} />

      {/* Legend */}
      <LegendBar />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <TableHeader viewMode={viewMode} visibleCols={visibleCols} />
          <NodeList
            nodes={DELIVERY_DATA} viewMode={viewMode}
            expanded={expanded} onToggle={toggleExpanded}
            acceptance={acceptance} onAcceptChange={handleAcceptChange}
            annotations={annotations} onAnnotationAdd={handleAnnotationAdd}
            visibleCols={visibleCols} hiddenNodes={hiddenNodes}
          />
        </div>
      </div>
    </div>
  );
}
