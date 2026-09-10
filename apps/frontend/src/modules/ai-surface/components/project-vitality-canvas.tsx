import { useState } from 'react';
import type { ArtifactItem, CognitiveMessage } from '../types';
import { cn } from '@/lib/utils';
import {
  Activity,
  GitPullRequest,
  CheckCircle2,
  Circle,
  FileCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface ProjectVitalityCanvasProps {
  artifacts: Record<string, ArtifactItem>;
  messages: CognitiveMessage[];
  isDark?: boolean;
  onApproveWorkstream?: (issueKey: string) => void;
}

export function ProjectVitalityCanvas({
  artifacts,
  messages,
  isDark = true,
  onApproveWorkstream,
}: ProjectVitalityCanvasProps) {
  const [approvedIssue, setApprovedIssue] = useState<string | null>(null);
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'contract' | 'acceptance'>('overview');
  const [expandedThought, setExpandedThought] = useState(false);

  const handleApprove = (key: string) => {
    setApprovedIssue(key);
    onApproveWorkstream?.(key);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const codeArtifact = artifacts['artifact-diff-2'];
  const qaArtifact = artifacts['artifact-qa-3'];

  return (
    <div
      className="flex-1 flex flex-col gap-4 max-w-4xl mx-auto w-full px-2 pb-28 pt-1 select-text overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* 1. 项目全息脉搏中枢 (Project Vitality Core) */}
      <div
        className="relative rounded-3xl p-4 transition-all duration-300 backdrop-blur-2xl"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(245, 248, 255, 0.85) 100%)',
          boxShadow: isDark
            ? '0 16px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            : '0 16px 36px -10px rgba(30, 41, 59, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1)',
          color: isDark ? '#FFFFFF' : '#0F172A',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-current/10">
          <div className="flex items-center gap-3">
            {/* 项目脉搏指示器 */}
            <div
              className="relative flex items-center justify-center size-10 rounded-2xl text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                boxShadow: '0 0 18px rgba(139, 92, 246, 0.5)',
              }}
            >
              <Activity className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  智能协同执行引擎 (APM-Core)
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full font-mono font-semibold"
                  style={{
                    fontSize: 10,
                    background: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(99, 102, 241, 0.15)',
                    color: isDark ? '#DDD6FE' : '#4F46E5',
                  }}
                >
                  主线: CAP-P-01
                </span>
              </div>
              <p
                className="mt-0.5"
                style={{
                  fontSize: 11,
                  color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)',
                }}
              >
                工作区路由：独立 SQLite 库 (dev.db) · 全仓唯一真相：openapi.json
              </p>
            </div>
          </div>

          {/* 快速视角切换 */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.05)' }}
          >
            {[
              { id: 'overview', label: '项目态势' },
              { id: 'contract', label: '代码契约' },
              { id: 'acceptance', label: '门禁闭环' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer',
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'bg-white shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                style={{
                  fontSize: 11,
                  color: !isDark && activeTab === tab.id ? '#4F46E5' : undefined,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 项目 4 维关键属性徽章栏 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div
            className="p-2.5 rounded-xl flex items-center gap-2.5"
            style={{ background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)' }}
          >
            <Zap className="size-4 shrink-0" style={{ color: '#F59E0B' }} />
            <div>
              <span className="block font-mono font-bold" style={{ fontSize: 13, color: '#10B981' }}>
                96.4%
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
                }}
              >
                健康活力指数
              </span>
            </div>
          </div>

          <div
            className="p-2.5 rounded-xl flex items-center gap-2.5"
            style={{ background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)' }}
          >
            <ShieldCheck className="size-4 shrink-0" style={{ color: '#10B981' }} />
            <div>
              <span className="block font-mono font-bold" style={{ fontSize: 13, color: '#34D399' }}>
                零漂移
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
                }}
              >
                OpenAPI 契约
              </span>
            </div>
          </div>

          <div
            className="p-2.5 rounded-xl flex items-center gap-2.5"
            style={{ background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)' }}
          >
            <GitPullRequest className="size-4 shrink-0 text-accent-purple" />
            <div>
              <span className="block font-mono font-bold" style={{ fontSize: 13 }}>
                3 / 3 原子
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
                }}
              >
                Issue 自动化拆解
              </span>
            </div>
          </div>

          <div
            className="p-2.5 rounded-xl flex items-center gap-2.5"
            style={{ background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)' }}
          >
            <CheckCircle2 className="size-4 shrink-0" style={{ color: '#06B6D4' }} />
            <div>
              <span className="block font-mono font-bold" style={{ fontSize: 13 }}>
                4 项就绪
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
                }}
              >
                验收准则闭环
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 错落排列的项目属性工件区 (Organic Shards) */}

      {/* 视角 A: 项目需求主线与任务拆解拓扑 */}
      {(activeTab === 'overview' || activeTab === 'contract') && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* 左侧：CAP-P-01 任务原子拆解流 (占 7 列) */}
          <div
            className="md:col-span-7 rounded-3xl p-4 backdrop-blur-2xl transition-all"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
              boxShadow: isDark
                ? '0 12px 30px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 28px -8px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-current/10">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-accent-purple" />
                <h3 className="font-semibold text-xs">主线工单原子拆解演进 (Workstream)</h3>
              </div>
              <span
                className="font-mono px-1.5 py-0.2 rounded"
                style={{
                  fontSize: 9,
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                }}
              >
                ACTIVE SPRINT
              </span>
            </div>

            {/* 3 个拆解原子任务卡片（错落箭头接力） */}
            <div className="flex flex-col gap-2.5">
              {/* 原子 1 */}
              <div
                className="p-2.5 rounded-2xl flex items-center justify-between gap-3 border border-current/5"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex items-center justify-center size-6 rounded-lg font-mono font-bold text-xs shrink-0"
                    style={{ color: '#10B981', background: 'rgba(16, 185, 129, 0.12)' }}
                  >
                    ✓
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold" style={{ fontSize: 11 }}>
                        APM-101
                      </span>
                      <span className="truncate font-medium" style={{ fontSize: 11 }}>
                        需求管道与验收契约结构定义
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      负责人: Aria (PM) · 验收通过
                    </span>
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full font-mono shrink-0"
                  style={{ fontSize: 9, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                >
                  DONE
                </span>
              </div>

              {/* 连线箭头指示 */}
              <div className="flex justify-center -my-1 text-muted-foreground/40">
                <ArrowRight className="size-3 rotate-90" />
              </div>

              {/* 原子 2 */}
              <div
                className="p-2.5 rounded-2xl flex items-center justify-between gap-3 border border-current/5"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex items-center justify-center size-6 rounded-lg font-mono font-bold text-xs shrink-0"
                    style={{ color: '#A855F7', background: 'rgba(168, 85, 247, 0.12)' }}
                  >
                    ⚡
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold" style={{ fontSize: 11 }}>
                        APM-102
                      </span>
                      <span className="truncate font-medium" style={{ fontSize: 11 }}>
                        多工作区 ALS 隔离路由基线加固
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      负责人: DaVinci (Arch) · 执行中
                    </span>
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full font-mono shrink-0"
                  style={{ fontSize: 9, background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}
                >
                  RUNNING
                </span>
              </div>

              {/* 连线箭头指示 */}
              <div className="flex justify-center -my-1 text-muted-foreground/40">
                <ArrowRight className="size-3 rotate-90" />
              </div>

              {/* 原子 3 (待裁决) */}
              <div
                className="p-2.5 rounded-2xl flex items-center justify-between gap-3 border"
                style={{
                  borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(99, 102, 241, 0.25)',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(238, 242, 255, 0.9) 0%, rgba(245, 243, 255, 0.8) 100%)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex items-center justify-center size-6 rounded-lg font-mono font-bold text-xs shrink-0"
                    style={{ color: '#F59E0B', background: 'rgba(245, 158, 11, 0.12)' }}
                  >
                    ⏸
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold" style={{ fontSize: 11 }}>
                        APM-103
                      </span>
                      <span className="truncate font-medium" style={{ fontSize: 11 }}>
                        AI 表面全屏无界表盘渲染层落地
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                      }}
                    >
                      负责人: Nexus (Coder) · 等待指挥官确认
                    </span>
                  </div>
                </div>

                {/* 裁决按钮 */}
                <button
                  type="button"
                  onClick={() => handleApprove('APM-103')}
                  className={cn(
                    'px-2.5 py-1 rounded-xl font-medium transition-all text-xs shrink-0 cursor-pointer flex items-center gap-1',
                    approvedIssue === 'APM-103'
                      ? 'font-semibold'
                      : 'bg-accent-purple text-white hover:opacity-90 shadow-md',
                  )}
                  style={{
                    fontSize: 10,
                    background: approvedIssue === 'APM-103' ? 'rgba(16, 185, 129, 0.15)' : undefined,
                    color: approvedIssue === 'APM-103' ? '#10B981' : undefined,
                  }}
                >
                  {approvedIssue === 'APM-103' ? (
                    <>
                      <Check className="size-3" />
                      <span>已准入</span>
                    </>
                  ) : (
                    <span>批准执行 ⏎</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：代码契约与 Diff 审查浮岛 (占 5 列) */}
          <div
            className="md:col-span-5 rounded-3xl p-4 backdrop-blur-2xl transition-all"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
              boxShadow: isDark
                ? '0 12px 30px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 28px -8px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
              <div className="flex items-center gap-2">
                <FileCode className="size-4" style={{ color: '#10B981' }} />
                <h3 className="font-semibold text-xs">Prisma / OpenAPI 契约 Diff</h3>
              </div>
              {codeArtifact?.payload.codeSnippet && (
                <button
                  type="button"
                  onClick={() => handleCopy(codeArtifact.payload.codeSnippet!)}
                  className="px-2 py-0.5 rounded text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
                  style={{ fontSize: 9, background: 'rgba(255, 255, 255, 0.08)' }}
                >
                  {copiedDiff ? 'COPIED ✓' : 'COPY'}
                </button>
              )}
            </div>

            {codeArtifact?.payload.codeSnippet ? (
              <div
                className="rounded-xl overflow-hidden font-mono"
                style={{
                  fontSize: 10,
                  background: isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(15, 23, 42, 0.05)',
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              >
                <div
                  className="px-2.5 py-1 text-muted-foreground/60 border-b border-white/5 flex items-center justify-between"
                  style={{ fontSize: 9 }}
                >
                  <span>schema.prisma (+4 lines)</span>
                  <span>ZERO DRIFT</span>
                </div>
                <pre className="p-2.5 leading-relaxed overflow-x-auto">
                  <code>
                    {codeArtifact.payload.codeSnippet.split('\n').map((line, idx) => {
                      const isPlus = line.startsWith('+');
                      return (
                        <div
                          key={idx}
                          className="px-1 rounded"
                          style={{
                            backgroundColor: isPlus ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            color: isPlus ? '#34D399' : 'inherit',
                          }}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">暂无待审查的代码差异</p>
            )}

            {/* AI 架构师推演切片 */}
            <div className="mt-3 pt-2 border-t border-current/10">
              <button
                type="button"
                onClick={() => setExpandedThought(!expandedThought)}
                className="flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                style={{ fontSize: 10 }}
              >
                <Sparkles className="size-3 text-accent-purple" />
                <span>DaVinci 契约审查报告 (点击展开)</span>
                <ChevronDown
                  className={cn(
                    'size-3 transition-transform duration-200',
                    expandedThought && 'rotate-180',
                  )}
                />
              </button>
              {expandedThought && (
                <p
                  className="mt-1.5 leading-relaxed p-2 rounded-xl"
                  style={{
                    fontSize: 10,
                    background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.04)',
                    color: isDark ? '#CBD5E1' : '#334155',
                  }}
                >
                  已在测试库完成 SQLite 外键与 ALS 路由隔离仿真验证，零数据踩踏风险。符合全仓 V4
                  双表面治理基线。
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 视角 B: 自动化验收准则 Checklist 浮岛 */}
      {(activeTab === 'overview' || activeTab === 'acceptance') && qaArtifact?.payload.criteriaList && (
        <div
          className="rounded-3xl p-4 backdrop-blur-2xl transition-all"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
            boxShadow: isDark
              ? '0 12px 30px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 12px 28px -8px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4" style={{ color: '#10B981' }} />
              <h3 className="font-semibold text-xs">自动化验收准则与门禁审计 (Sentinel)</h3>
            </div>
            <span
              className="font-mono px-2 py-0.5 rounded-full"
              style={{
                fontSize: 9,
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#10B981',
              }}
            >
              4 / 5 已闭环
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {qaArtifact.payload.criteriaList.map((crit, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-xl border border-current/5"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.65)',
                }}
              >
                {crit.done ? (
                  <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                ) : (
                  <Circle className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn('leading-snug', crit.done && 'line-through text-muted-foreground')}
                    style={{ fontSize: 10 }}
                  >
                    {crit.label}
                  </p>
                </div>
                {crit.required && (
                  <span
                    className="px-1 rounded font-mono shrink-0"
                    style={{
                      fontSize: 8,
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                    }}
                  >
                    必测
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 指挥官协同与认知流回响 (Cognitive Synergy River) */}
      <div
        className="rounded-3xl p-4 backdrop-blur-2xl transition-all"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
          boxShadow: isDark
            ? '0 12px 30px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 12px 28px -8px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          color: isDark ? '#FFFFFF' : '#0F172A',
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-current/10">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent-purple" />
            <h3 className="font-semibold text-xs">指挥官协同与认知流回响</h3>
          </div>
          <span
            className="font-mono px-2 py-0.5 rounded-full"
            style={{
              fontSize: 9,
              background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.12)',
              color: isDark ? '#DDD6FE' : '#4F46E5',
            }}
          >
            {messages.length} 条认知共鸣
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="p-3 rounded-2xl border border-current/5 transition-all"
              style={{
                background:
                  msg.senderId === 'user-human'
                    ? isDark
                      ? 'rgba(139, 92, 246, 0.12)'
                      : 'rgba(99, 102, 241, 0.08)'
                    : isDark
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{msg.avatar}</span>
                  <span className="font-semibold text-xs tracking-tight">{msg.senderName}</span>
                </div>
                <span className="font-mono text-muted-foreground/60" style={{ fontSize: 9 }}>
                  {msg.timestamp}
                </span>
              </div>
              <p
                className="leading-relaxed"
                style={{
                  fontSize: 11,
                  color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.85)',
                }}
              >
                {msg.content}
              </p>
              {msg.thoughts && msg.thoughts.length > 0 && (
                <div
                  className="mt-2 p-2 rounded-xl border border-current/5 font-mono"
                  style={{
                    fontSize: 10,
                    background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.04)',
                    color: isDark ? '#C4B5FD' : '#6366F1',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3" />
                    <span className="font-semibold">{msg.thoughts[0].title}</span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground" style={{ fontSize: 9 }}>
                    {msg.thoughts[0].description} ({msg.thoughts[0].durationMs}ms)
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
