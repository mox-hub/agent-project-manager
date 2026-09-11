import { useState, useRef, useEffect, useCallback, type UIEvent } from 'react';
import type { ArtifactItem, CognitiveMessage } from '../types';
import { cn } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  Circle,
  FileCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Check,
} from 'lucide-react';

interface CentralWatchDialProps {
  artifacts: Record<string, ArtifactItem>;
  messages: CognitiveMessage[];
  isDark?: boolean;
  onApproveWorkstream?: (issueKey: string) => void;
}

export function CentralWatchDial({
  artifacts,
  messages,
  isDark = true,
  onApproveWorkstream,
}: CentralWatchDialProps) {
  const [approvedIssue, setApprovedIssue] = useState<string | null>(null);
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'contract' | 'acceptance' | 'stream'>('overview');
  const [scrollProgress, setScrollProgress] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [cardScales, setCardScales] = useState<number[]>([1, 1, 1, 1]);
  const [cardOpacities, setCardOpacities] = useState<number[]>([1, 1, 1, 1]);

  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);

  const handleApprove = (key: string) => {
    setApprovedIssue(key);
    onApproveWorkstream?.(key);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  // 监听表盘内滚动，计算弧形滚动条进度与各卡片距离中心点的 3D 缩放
  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollTop / maxScroll)) : 0;
    setScrollProgress(progress);

    // 计算表盘内部视口中心
    const viewportRect = el.getBoundingClientRect();
    const viewportCenterY = viewportRect.top + viewportRect.height / 2;
    const maxDistance = viewportRect.height / 2;

    const refs = [card1Ref, card2Ref, card3Ref, card4Ref];
    const nextScales: number[] = [];
    const nextOpacities: number[] = [];

    refs.forEach((ref) => {
      if (!ref.current) {
        nextScales.push(1);
        nextOpacities.push(1);
        return;
      }
      const rect = ref.current.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(cardCenterY - viewportCenterY);
      const ratio = Math.min(1, distance / maxDistance);

      // 中心位置放大为 1，向上下远端缩小至 0.82
      const scale = 1 - Math.pow(ratio, 1.8) * 0.18;
      // 中心位置不透明度为 1，上下远端淡化至 0.45
      const opacity = 1 - Math.pow(ratio, 1.5) * 0.55;

      nextScales.push(Number(scale.toFixed(3)));
      nextOpacities.push(Number(opacity.toFixed(3)));
    });

    setCardScales(nextScales);
    setCardOpacities(nextOpacities);
  }, []);

  // 初始挂载时触发一次滚动计算
  useEffect(() => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const event = { currentTarget: el } as UIEvent<HTMLDivElement>;
      handleScroll(event);
    }
  }, [handleScroll]);

  const codeArtifact = artifacts['artifact-diff-2'];
  const qaArtifact = artifacts['artifact-qa-3'];

  // 生成手表表盘 60 个刻度点与数字 (放大至 720px 精密工业表壳)
  const DIAL_RADIUS = 348;
  const DIAL_CENTER = 360;
  const TICKS = Array.from({ length: 60 }, (_, i) => {
    const isMajor = i % 5 === 0;
    const angleRad = ((i * 6 - 90) * Math.PI) / 180;
    const outerR = DIAL_RADIUS;
    const innerR = isMajor ? DIAL_RADIUS - 14 : DIAL_RADIUS - 7;

    return {
      index: i,
      isMajor,
      x1: DIAL_CENTER + outerR * Math.cos(angleRad),
      y1: DIAL_CENTER + outerR * Math.sin(angleRad),
      x2: DIAL_CENTER + innerR * Math.cos(angleRad),
      y2: DIAL_CENTER + innerR * Math.sin(angleRad),
      numX: DIAL_CENTER + (DIAL_RADIUS - 26) * Math.cos(angleRad),
      numY: DIAL_CENTER + (DIAL_RADIUS - 26) * Math.sin(angleRad),
      label: i === 0 ? '60' : String(i).padStart(2, '0'),
    };
  });

  // 贴合表盘内侧的弧形滚动条参数 (位于表盘内侧右缘，从 -52° 到 +52°)
  const ARC_RADIUS = 302;
  const ARC_START_DEG = -52;
  const ARC_END_DEG = 52;
  const ARC_SPAN_DEG = ARC_END_DEG - ARC_START_DEG;

  const currentKnobAngleDeg = ARC_START_DEG + scrollProgress * ARC_SPAN_DEG;
  const currentKnobAngleRad = (currentKnobAngleDeg * Math.PI) / 180;
  const knobX = DIAL_CENTER + ARC_RADIUS * Math.cos(currentKnobAngleRad);
  const knobY = DIAL_CENTER + ARC_RADIUS * Math.sin(currentKnobAngleRad);

  // 弧形滚动轨道的 SVG Path
  const startRad = (ARC_START_DEG * Math.PI) / 180;
  const endRad = (ARC_END_DEG * Math.PI) / 180;
  const arcStartX = DIAL_CENTER + ARC_RADIUS * Math.cos(startRad);
  const arcStartY = DIAL_CENTER + ARC_RADIUS * Math.sin(startRad);
  const arcEndX = DIAL_CENTER + ARC_RADIUS * Math.cos(endRad);
  const arcEndY = DIAL_CENTER + ARC_RADIUS * Math.sin(endRad);
  const arcTrackPath = `M ${arcStartX} ${arcStartY} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${arcEndX} ${arcEndY}`;
  const arcProgressPath = `M ${arcStartX} ${arcStartY} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${knobX} ${knobY}`;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: 720, height: 720 }}
    >
      {/* 1. 表盘外表圈刻度与金属边框 SVG (Watch Bezel Frame) */}
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-visible z-10"
        viewBox="0 0 720 720"
      >
        <defs>
          <radialGradient id="dialGlow" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#8B5CF6" stopOpacity="0.03" />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        {/* 外侧呼吸光圈 */}
        <circle
          cx={DIAL_CENTER}
          cy={DIAL_CENTER}
          r={DIAL_RADIUS + 4}
          fill="none"
          stroke="url(#dialGlow)"
          strokeWidth="3"
        />

        {/* 主金属表壳双圆环 */}
        <circle
          cx={DIAL_CENTER}
          cy={DIAL_CENTER}
          r={DIAL_RADIUS}
          fill="none"
          stroke={isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)'}
          strokeWidth="2"
        />
        <circle
          cx={DIAL_CENTER}
          cy={DIAL_CENTER}
          r={DIAL_RADIUS - 14}
          fill="none"
          stroke={isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(99, 102, 241, 0.35)'}
          strokeWidth="1"
          strokeDasharray="2 4"
        />

        {/* 60 个精工手表外圈刻度与数字 */}
        {TICKS.map((tick) => (
          <g key={tick.index}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={
                tick.isMajor
                  ? isDark
                    ? '#A78BFA'
                    : '#6366F1'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(15, 23, 42, 0.25)'
              }
              strokeWidth={tick.isMajor ? 2 : 1}
            />
            {tick.isMajor && tick.index % 15 === 0 && (
              <text
                x={tick.numX}
                y={tick.numY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)'}
                className="font-mono font-bold"
                style={{ fontSize: 9 }}
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}

        {/* 贴合表盘内侧的弧形滚动条背景轨道 (Radial Arc Scroll Track) */}
        <path
          d={arcTrackPath}
          fill="none"
          stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)'}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 弧形滚动进度发光条 */}
        <path
          d={arcProgressPath}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.8))' }}
        />

        {/* 弧形滚动滑块宝石光标 (Glowing Sapphire Runner Knob) */}
        <circle
          cx={knobX}
          cy={knobY}
          r="5"
          fill="#34D399"
          style={{ filter: 'drop-shadow(0 0 8px #34D399)' }}
        />
        <circle cx={knobX} cy={knobY} r="2.5" fill="#FFFFFF" />
      </svg>

      {/* 2. 表盘内侧视口容器 (圆形裁剪，内部卡片具有 3D 景深滚动缩放) */}
      <div
        className="relative overflow-hidden rounded-full backdrop-blur-3xl flex flex-col items-center justify-between"
        style={{
          width: 624,
          height: 624,
          background: isDark
            ? 'radial-gradient(circle at 50% 50%, rgba(18, 22, 34, 0.95) 0%, rgba(7, 8, 12, 0.98) 100%)'
            : 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.96) 0%, rgba(240, 244, 255, 0.92) 100%)',
          boxShadow: isDark
            ? 'inset 0 0 40px rgba(0, 0, 0, 0.8), 0 20px 50px rgba(0, 0, 0, 0.6)'
            : 'inset 0 0 30px rgba(99, 102, 241, 0.08), 0 20px 45px rgba(30, 41, 59, 0.12)',
        }}
      >
        {/* 常驻 HUD (顶部固定仪表盘，不随卡片滚动) */}
        <div
          className="absolute top-0 inset-x-0 z-30 pt-5 pb-2 px-8 flex flex-col items-center gap-1.5 backdrop-blur-md pointer-events-auto select-none"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, rgba(7, 8, 12, 0.92) 0%, rgba(7, 8, 12, 0.65) 75%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.7) 75%, transparent 100%)',
          }}
        >
          {/* 项目核心活力徽章与脉搏 */}
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-6 rounded-lg text-white"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
                }}
              >
                <Activity className="size-3.5 animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-tight">APM-Core</span>
                <span
                  className="px-1.5 py-0.2 rounded font-mono font-semibold"
                  style={{
                    fontSize: 9,
                    background: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(99, 102, 241, 0.15)',
                    color: isDark ? '#DDD6FE' : '#4F46E5',
                  }}
                >
                  CAP-P-01
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold" style={{ fontSize: 11, color: '#10B981' }}>
                96.4% 活力
              </span>
              <span
                className="px-1.5 py-0.2 rounded"
                style={{
                  fontSize: 8,
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: '#10B981',
                }}
              >
                零漂移
              </span>
            </div>
          </div>

          {/* 快速视角切换 Tab 胶囊 */}
          <div
            className="flex items-center gap-1 p-0.5 rounded-xl mt-0.5"
            style={{ background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)' }}
          >
            {[
              { id: 'overview', label: '项目态势' },
              { id: 'contract', label: '代码契约' },
              { id: 'acceptance', label: '门禁闭环' },
              { id: 'stream', label: '认知共鸣' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'overview' | 'contract' | 'acceptance' | 'stream')}
                className={cn(
                  'px-2.5 py-0.5 rounded-lg font-medium transition-all cursor-pointer',
                  activeTab === tab.id
                    ? isDark
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'bg-white shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                style={{
                  fontSize: 10,
                  color: !isDark && activeTab === tab.id ? '#4F46E5' : undefined,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内部 3D 景深滚动列表 (支持随着上下远近放大缩小，原生直杆滚动条已完全隐藏，仅保留右缘贴合圆弧滚动条) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="size-full overflow-y-auto overflow-x-hidden pt-24 pb-20 px-8 flex flex-col gap-4 no-scrollbar scroll-smooth select-text"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* 卡片 1：主线任务拆解链 (CAP-P-01 演进拓扑) */}
          {(activeTab === 'overview' || activeTab === 'contract') && (
            <div
              ref={card1Ref}
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10"
              style={{
                transform: `scale(${cardScales[0]})`,
                opacity: cardOpacities[0],
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(245, 248, 255, 0.85) 100%)',
                boxShadow: isDark
                  ? '0 10px 25px -6px rgba(0, 0, 0, 0.5)'
                  : '0 10px 25px -6px rgba(30, 41, 59, 0.08)',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3.5" style={{ color: '#F59E0B' }} />
                  <span className="font-bold text-xs">主线任务拆解链 (CAP-P-01)</span>
                </div>
                <span
                  className="font-mono font-medium px-1.5 py-0.2 rounded"
                  style={{
                    fontSize: 9,
                    background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.12)',
                    color: isDark ? '#DDD6FE' : '#4F46E5',
                  }}
                >
                  3 个原子工单
                </span>
              </div>

              {/* 拆解原子接力 */}
              <div className="flex flex-col gap-1.5">
                {/* 原子 1 */}
                <div
                  className="p-2 rounded-xl flex items-center justify-between gap-2 border border-current/5"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex items-center justify-center size-5 rounded-md font-mono font-bold shrink-0"
                      style={{ fontSize: 10, color: '#10B981', background: 'rgba(16, 185, 129, 0.12)' }}
                    >
                      ✓
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold" style={{ fontSize: 10 }}>
                          APM-101
                        </span>
                        <span className="truncate font-medium" style={{ fontSize: 10 }}>
                          需求管道与验收契约定义
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                        }}
                      >
                        负责人: Aria (PM) · 验收通过
                      </span>
                    </div>
                  </div>
                  <span
                    className="px-1.5 py-0.2 rounded font-mono shrink-0 font-bold"
                    style={{ fontSize: 8, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
                  >
                    DONE
                  </span>
                </div>

                <div className="flex justify-center -my-0.5 text-muted-foreground/40">
                  <ArrowRight className="size-2.5 rotate-90" />
                </div>

                {/* 原子 2 */}
                <div
                  className="p-2 rounded-xl flex items-center justify-between gap-2 border border-current/5"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex items-center justify-center size-5 rounded-md font-mono font-bold shrink-0"
                      style={{ fontSize: 10, color: '#A855F7', background: 'rgba(168, 85, 247, 0.12)' }}
                    >
                      ⚡
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold" style={{ fontSize: 10 }}>
                          APM-102
                        </span>
                        <span className="truncate font-medium" style={{ fontSize: 10 }}>
                          多工作区 ALS 隔离路由加固
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                        }}
                      >
                        负责人: DaVinci (Arch) · 执行中
                      </span>
                    </div>
                  </div>
                  <span
                    className="px-1.5 py-0.2 rounded font-mono shrink-0 font-bold"
                    style={{ fontSize: 8, background: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA' }}
                  >
                    RUNNING
                  </span>
                </div>

                <div className="flex justify-center -my-0.5 text-muted-foreground/40">
                  <ArrowRight className="size-2.5 rotate-90" />
                </div>

                {/* 原子 3 (待裁决) */}
                <div
                  className="p-2 rounded-xl flex items-center justify-between gap-2 border"
                  style={{
                    borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(99, 102, 241, 0.25)',
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)'
                      : 'linear-gradient(135deg, rgba(238, 242, 255, 0.9) 0%, rgba(245, 243, 255, 0.8) 100%)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex items-center justify-center size-5 rounded-md font-mono font-bold shrink-0"
                      style={{ fontSize: 10, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.12)' }}
                    >
                      ⏸
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold" style={{ fontSize: 10 }}>
                          APM-103
                        </span>
                        <span className="truncate font-medium" style={{ fontSize: 10 }}>
                          AI 表面全屏手表表盘落地
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                        }}
                      >
                        Nexus (Coder) · 待指挥官准入
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApprove('APM-103')}
                    className={cn(
                      'px-2 py-0.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1',
                      approvedIssue === 'APM-103'
                        ? 'font-semibold'
                        : 'bg-accent-purple text-white hover:opacity-90 shadow-sm',
                    )}
                    style={{
                      fontSize: 9,
                      background: approvedIssue === 'APM-103' ? 'rgba(16, 185, 129, 0.15)' : undefined,
                      color: approvedIssue === 'APM-103' ? '#10B981' : undefined,
                    }}
                  >
                    {approvedIssue === 'APM-103' ? (
                      <>
                        <Check className="size-2.5" />
                        <span>已准入</span>
                      </>
                    ) : (
                      <span>准入</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 卡片 2：Prisma & OpenAPI 契约 Diff */}
          {(activeTab === 'overview' || activeTab === 'contract') && codeArtifact && (
            <div
              ref={card2Ref}
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10"
              style={{
                transform: `scale(${cardScales[1]})`,
                opacity: cardOpacities[1],
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(245, 248, 255, 0.85) 100%)',
                boxShadow: isDark
                  ? '0 10px 25px -6px rgba(0, 0, 0, 0.5)'
                  : '0 10px 25px -6px rgba(30, 41, 59, 0.08)',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                <div className="flex items-center gap-1.5">
                  <FileCode className="size-3.5" style={{ color: '#10B981' }} />
                  <span className="font-bold text-xs">Prisma / OpenAPI 契约 Diff</span>
                </div>
                {codeArtifact.payload.codeSnippet && (
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

              {codeArtifact.payload.codeSnippet && (
                <div
                  className="p-2.5 rounded-xl font-mono overflow-x-auto"
                  style={{
                    fontSize: 9,
                    lineHeight: 1.4,
                    background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <pre className="text-muted-foreground">
                    <code>{codeArtifact.payload.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* 卡片 3：自动化验收准则与门禁审计 (Sentinel) */}
          {(activeTab === 'overview' || activeTab === 'acceptance') && qaArtifact?.payload?.criteriaList && (
            <div
              ref={card3Ref}
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10"
              style={{
                transform: `scale(${cardScales[2]})`,
                opacity: cardOpacities[2],
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(245, 248, 255, 0.85) 100%)',
                boxShadow: isDark
                  ? '0 10px 25px -6px rgba(0, 0, 0, 0.5)'
                  : '0 10px 25px -6px rgba(30, 41, 59, 0.08)',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" style={{ color: '#10B981' }} />
                  <span className="font-bold text-xs">自动化验收准则与门禁审计 (Sentinel)</span>
                </div>
                <span
                  className="font-mono px-1.5 py-0.2 rounded font-bold"
                  style={{
                    fontSize: 8,
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#10B981',
                  }}
                >
                  4 / 5 已闭环
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {qaArtifact.payload.criteriaList.map((crit, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 p-1.5 rounded-lg border border-current/5"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.65)',
                    }}
                  >
                    {crit.done ? (
                      <CheckCircle2 className="size-3 shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                    ) : (
                      <Circle className="size-3 shrink-0 mt-0.5 text-muted-foreground/60" />
                    )}
                    <span
                      className={cn('flex-1 leading-snug truncate', crit.done && 'line-through text-muted-foreground')}
                      style={{ fontSize: 9 }}
                    >
                      {crit.label}
                    </span>
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

          {/* 卡片 4：指挥官协同与认知流回响 (Cognitive Synergy River) */}
          {(activeTab === 'overview' || activeTab === 'stream') && (
            <div
              ref={card4Ref}
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10"
              style={{
                transform: `scale(${cardScales[3]})`,
                opacity: cardOpacities[3],
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(245, 248, 255, 0.85) 100%)',
                boxShadow: isDark
                  ? '0 10px 25px -6px rgba(0, 0, 0, 0.5)'
                  : '0 10px 25px -6px rgba(30, 41, 59, 0.08)',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-accent-purple" />
                  <span className="font-bold text-xs">指挥官协同与认知流回响</span>
                </div>
                <span
                  className="font-mono px-1.5 py-0.2 rounded font-bold"
                  style={{
                    fontSize: 8,
                    background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.12)',
                    color: isDark ? '#DDD6FE' : '#4F46E5',
                  }}
                >
                  {messages.length} 条共鸣
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-xl border border-current/5 transition-all"
                    style={{
                      background:
                        msg.senderId === 'user-human'
                          ? isDark
                            ? 'rgba(139, 92, 246, 0.15)'
                            : 'rgba(99, 102, 241, 0.08)'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{msg.avatar}</span>
                        <span className="font-semibold text-xs tracking-tight">{msg.senderName}</span>
                      </div>
                      <span className="font-mono text-muted-foreground/60" style={{ fontSize: 8 }}>
                        {msg.timestamp}
                      </span>
                    </div>
                    <p
                      className="leading-relaxed"
                      style={{
                        fontSize: 10,
                        color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(15, 23, 42, 0.85)',
                      }}
                    >
                      {msg.content}
                    </p>
                    {msg.thoughts && msg.thoughts.length > 0 && (
                      <div
                        className="mt-1.5 p-1.5 rounded-lg border border-current/5 font-mono"
                        style={{
                          fontSize: 9,
                          background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.04)',
                          color: isDark ? '#C4B5FD' : '#6366F1',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <Sparkles className="size-2.5" />
                          <span className="font-semibold">{msg.thoughts[0].title}</span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground truncate" style={{ fontSize: 8 }}>
                          {msg.thoughts[0].description} ({msg.thoughts[0].durationMs}ms)
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 常驻 HUD (底部固定遥测状态栏) */}
        <div
          className="absolute bottom-0 inset-x-0 z-30 pb-4 pt-3 px-8 flex items-center justify-center backdrop-blur-md pointer-events-auto select-none font-mono"
          style={{
            background: isDark
              ? 'linear-gradient(0deg, rgba(7, 8, 12, 0.92) 0%, rgba(7, 8, 12, 0.65) 75%, transparent 100%)'
              : 'linear-gradient(0deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.7) 75%, transparent 100%)',
          }}
        >
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full border border-current/10"
            style={{
              fontSize: 9,
              background: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.8)',
            }}
          >
            <ShieldCheck className="size-3" style={{ color: '#10B981' }} />
            <span style={{ color: '#10B981' }}>LEVEL 3 准自主</span>
            <span className="text-muted-foreground">·</span>
            <span>OPENAPI ZERO-DRIFT</span>
            <span className="text-muted-foreground">·</span>
            <span>4/5 准则闭环</span>
          </div>
        </div>
      </div>
    </div>
  );
}