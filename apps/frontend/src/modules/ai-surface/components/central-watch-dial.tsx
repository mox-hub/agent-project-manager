import { useState, useRef, useEffect, useCallback, type UIEvent } from 'react';
import type { ArtifactItem, CognitiveMessage } from '../types';
import { SampleTag } from './sample-tag';
import { cn } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  Circle,
  FileCode,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface CentralWatchDialProps {
  artifacts: Record<string, ArtifactItem>;
  messages: CognitiveMessage[];
  isDark?: boolean;
}

export function CentralWatchDial({
  artifacts,
  messages,
  isDark = true,
}: CentralWatchDialProps) {
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
            <stop offset="70%" stopColor="hsl(var(--accent-purple))" stopOpacity="0.03" />
            <stop offset="95%" stopColor="hsl(var(--accent-purple))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--accent-purple))" stopOpacity="0.6" />
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
          stroke={isDark ? 'hsl(var(--foreground) / 0.2)' : 'hsl(var(--foreground) / 0.2)'}
          strokeWidth="2"
        />
        <circle
          cx={DIAL_CENTER}
          cy={DIAL_CENTER}
          r={DIAL_RADIUS - 14}
          fill="none"
          stroke={isDark ? 'hsl(var(--accent-purple) / 0.35)' : 'hsl(var(--accent-purple) / 0.35)'}
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
                    ? 'hsl(var(--accent-purple))'
                    : 'hsl(var(--accent-purple))'
                  : isDark
                  ? 'hsl(var(--foreground) / 0.25)'
                  : 'hsl(var(--foreground) / 0.25)'
              }
              strokeWidth={tick.isMajor ? 2 : 1}
            />
            {tick.isMajor && tick.index % 15 === 0 && (
              <text
                x={tick.numX}
                y={tick.numY}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isDark ? 'hsl(var(--foreground) / 0.6)' : 'hsl(var(--foreground) / 0.6)'}
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
          stroke={isDark ? 'hsl(var(--foreground) / 0.12)' : 'hsl(var(--foreground) / 0.12)'}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* 弧形滚动进度发光条 */}
        <path
          d={arcProgressPath}
          fill="none"
          stroke="hsl(var(--accent-purple))"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px hsl(var(--accent-purple) / 0.8))' }}
        />

        {/* 弧形滚动滑块宝石光标 (Glowing Sapphire Runner Knob) */}
        <circle
          cx={knobX}
          cy={knobY}
          r="5"
          fill="hsl(var(--accent-green))"
          style={{ filter: 'drop-shadow(0 0 8px hsl(var(--accent-green)))' }}
        />
        <circle cx={knobX} cy={knobY} r="2.5" fill="hsl(var(--foreground))" />
      </svg>

      {/* 2. 表盘内侧视口容器 (圆形裁剪，内部卡片具有 3D 景深滚动缩放) */}
      <div
        className="relative overflow-hidden rounded-full backdrop-blur-3xl shadow-xs flex flex-col items-center justify-between"
        style={{
          width: 624,
          height: 624,
          background: isDark
            ? 'radial-gradient(circle at 50% 50%, hsl(var(--background) / 0.95) 0%, hsl(var(--background) / 0.98) 100%)'
            : 'radial-gradient(circle at 50% 50%, hsl(var(--background) / 0.96) 0%, hsl(var(--background) / 0.92) 100%)',
        }}
      >
        {/* 常驻 HUD (顶部固定仪表盘，不随卡片滚动) */}
        <div
          className="absolute top-0 inset-x-0 z-30 pt-5 pb-2 px-8 flex flex-col items-center gap-1.5 backdrop-blur-md pointer-events-auto select-none"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.65) 75%, transparent 100%)'
              : 'linear-gradient(180deg, hsl(var(--background) / 0.94) 0%, hsl(var(--background) / 0.7) 75%, transparent 100%)',
          }}
        >
          {/* 表盘标题栏。
              原实现在这条栏上挂了三个**编造读数**：`CAP-P-01` 徽章（表盘并没有在跟踪某个
              能力卡）、`96.4% 活力`、`零漂移`——三者服务端都没有口径，且与底部那条
              `LEVEL 3 准自主 · OPENAPI ZERO-DRIFT · 4/5 准则闭环` 同属"长得像实时仪表"的形态。
              S2-e 一并清零：真数据进来假数据必须走（§4.7 不伪造）。表盘**自身内容**是示例
              剧本，故在此就地标注，不再依赖页头那枚隔着整屏的徽标。 */}
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-6 rounded-lg text-primary-foreground"
                style={{
                  background:
                    'linear-gradient(135deg, hsl(var(--accent-purple)) 0%, hsl(var(--accent-purple)) 100%)',
                }}
              >
                <Activity className="size-3" />
              </div>
              <span className="font-bold text-xs tracking-tight">中央视界</span>
              <SampleTag title="表盘内四张卡片（拆解链 / 契约 Diff / 验收清单 / 认知共鸣）为示例演示，尚未接入真实数据源" />
            </div>
          </div>

          {/* 快速视角切换 Tab 胶囊 */}
          <div
            className="flex items-center gap-1 p-0.5 rounded-xl mt-0.5"
            style={{ background: isDark ? 'hsl(var(--foreground) / 0.08)' : 'hsl(var(--foreground) / 0.06)' }}
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
                  // 激活 Tab 底走 --muted：原样是「dark 20% 白叠层 / light 纯白胶囊」，
                  // 而明眸主题 --background 即纯白 → 浅色下激活底与背景同色、选中态
                  // 隐形。两臂原本还一粗一细，属既有不对称，一并对齐到 font-semibold。
                  activeTab === tab.id
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                style={{
                  fontSize: 10,
                  color: !isDark && activeTab === tab.id ? 'hsl(var(--accent-blue))' : undefined,
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
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10 shadow-xs"
              style={{
                transform: `scale(${cardScales[0]})`,
                opacity: cardOpacities[0],
                background: isDark
                  ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.02) 100%)'
                  : 'linear-gradient(135deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.85) 100%)',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3.5" style={{ color: 'hsl(var(--accent-yellow))' }} />
                  <span className="font-bold text-xs">主线任务拆解链 (CAP-P-01)</span>
                </div>
                <span
                  className="font-mono font-medium px-1.5 py-0.2 rounded"
                  style={{
                    fontSize: 9,
                    background: isDark ? 'hsl(var(--accent-purple) / 0.2)' : 'hsl(var(--accent-purple) / 0.12)',
                    color: isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))',
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
                    background:
                      isDark ? 'hsl(var(--foreground) / 0.04)' : 'hsl(var(--background) / 0.7)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex items-center justify-center size-5 rounded-md font-mono font-bold shrink-0"
                      style={{ fontSize: 10, color: 'hsl(var(--accent-green))', background: 'hsl(var(--accent-green) / 0.12)' }}
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
                          color: isDark ? 'hsl(var(--foreground) / 0.5)' : 'hsl(var(--foreground) / 0.5)',
                        }}
                      >
                        负责人: Aria (PM) · 验收通过
                      </span>
                    </div>
                  </div>
                  <span
                    className="px-1.5 py-0.2 rounded font-mono shrink-0 font-bold"
                    style={{ fontSize: 8, background: 'hsl(var(--accent-green) / 0.15)', color: 'hsl(var(--accent-green))' }}
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
                    background:
                      isDark ? 'hsl(var(--foreground) / 0.04)' : 'hsl(var(--background) / 0.7)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex items-center justify-center size-5 rounded-md font-mono font-bold shrink-0"
                      style={{ fontSize: 10, color: 'hsl(var(--accent-purple))', background: 'hsl(var(--accent-purple) / 0.12)' }}
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
                          color: isDark ? 'hsl(var(--foreground) / 0.5)' : 'hsl(var(--foreground) / 0.5)',
                        }}
                      >
                        负责人: DaVinci (Arch) · 执行中
                      </span>
                    </div>
                  </div>
                  <span
                    className="px-1.5 py-0.2 rounded font-mono shrink-0 font-bold"
                    style={{ fontSize: 8, background: 'hsl(var(--accent-purple) / 0.15)', color: 'hsl(var(--accent-purple))' }}
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
                    borderColor:
                      isDark
                        ? 'hsl(var(--accent-purple) / 0.35)'
                        : 'hsl(var(--accent-purple) / 0.25)',
                    background: isDark
                      ? 'linear-gradient(135deg, hsl(var(--accent-purple) / 0.12) 0%, hsl(var(--accent-purple) / 0.06) 100%)'
                      : 'linear-gradient(135deg, hsl(var(--background) / 0.9) 0%, hsl(var(--background) / 0.8) 100%)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex items-center justify-center size-5 rounded-md font-mono font-bold shrink-0"
                      style={{ fontSize: 10, color: 'hsl(var(--accent-yellow))', background: 'hsl(var(--accent-yellow) / 0.12)' }}
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
                          color: isDark ? 'hsl(var(--foreground) / 0.5)' : 'hsl(var(--foreground) / 0.5)',
                        }}
                      >
                        Nexus (Coder) · 待指挥官准入
                      </span>
                    </div>
                  </div>

                  {/* 原此处是一个「准入」按钮：点击后**只改本地 state** 显示「已准入」——
                      一个假成功。它同时踩了两条线：§4.7「不伪造」（看起来像批了，其实什么都没落），
                      以及「不开第二个拍板入口」（决策必须回决策收件箱 / 待办区的就地决策卡）。
                      S2-e 删除，不再提供任何看起来能拍板的东西。 */}
                  <span
                    className="shrink-0 rounded px-1.5 py-0.2 font-mono"
                    style={{ fontSize: 8, background: 'hsl(var(--foreground) / 0.08)' }}
                    title="示例条目；真实待拍板事项见页面上方「该你了」待办区"
                  >
                    待裁决
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 卡片 2：Prisma & OpenAPI 契约 Diff */}
          {(activeTab === 'overview' || activeTab === 'contract') && codeArtifact && (
            <div
              ref={card2Ref}
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10 shadow-xs"
              style={{
                transform: `scale(${cardScales[1]})`,
                opacity: cardOpacities[1],
                background: isDark
                  ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.02) 100%)'
                  : 'linear-gradient(135deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.85) 100%)',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                <div className="flex items-center gap-1.5">
                  <FileCode className="size-3.5" style={{ color: 'hsl(var(--accent-green))' }} />
                  <span className="font-bold text-xs">Prisma / OpenAPI 契约 Diff</span>
                </div>
                {codeArtifact.payload.codeSnippet && (
                  <button
                    type="button"
                    onClick={() => handleCopy(codeArtifact.payload.codeSnippet!)}
                    className="px-2 py-0.5 rounded text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
                    style={{ fontSize: 9, background: 'hsl(var(--foreground) / 0.08)' }}
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
                    background: isDark ? 'hsl(var(--background) / 0.5)' : 'hsl(var(--foreground) / 0.05)',
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
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10 shadow-xs"
              style={{
                transform: `scale(${cardScales[2]})`,
                opacity: cardOpacities[2],
                background: isDark
                  ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.02) 100%)'
                  : 'linear-gradient(135deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.85) 100%)',
              }}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" style={{ color: 'hsl(var(--accent-green))' }} />
                  <span className="font-bold text-xs">自动化验收准则与门禁审计 (Sentinel)</span>
                </div>
                <span
                  className="font-mono px-1.5 py-0.2 rounded font-bold"
                  style={{
                    fontSize: 8,
                    background: 'hsl(var(--accent-green) / 0.15)',
                    color: 'hsl(var(--accent-green))',
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
                      background: isDark ? 'hsl(var(--foreground) / 0.03)' : 'hsl(var(--background) / 0.65)',
                    }}
                  >
                    {crit.done ? (
                      <CheckCircle2 className="size-3 shrink-0 mt-0.5" style={{ color: 'hsl(var(--accent-green))' }} />
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
                          background: 'hsl(var(--accent-red) / 0.15)',
                          color: 'hsl(var(--accent-red))',
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
              className="rounded-2xl p-3.5 backdrop-blur-xl transition-all duration-200 border border-current/10 shadow-xs"
              style={{
                transform: `scale(${cardScales[3]})`,
                opacity: cardOpacities[3],
                background: isDark
                  ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.02) 100%)'
                  : 'linear-gradient(135deg, hsl(var(--background) / 0.92) 0%, hsl(var(--background) / 0.85) 100%)',
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
                    background: isDark ? 'hsl(var(--accent-purple) / 0.2)' : 'hsl(var(--accent-purple) / 0.12)',
                    color: isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))',
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
                            ? 'hsl(var(--accent-purple) / 0.15)'
                            : 'hsl(var(--accent-purple) / 0.08)'
                          : isDark
                          ? 'hsl(var(--foreground) / 0.03)'
                          : 'hsl(var(--background) / 0.7)',
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
                        color: isDark ? 'hsl(var(--foreground) / 0.85)' : 'hsl(var(--foreground) / 0.85)',
                      }}
                    >
                      {msg.content}
                    </p>
                    {msg.thoughts && msg.thoughts.length > 0 && (
                      <div
                        className="mt-1.5 p-1.5 rounded-lg border border-current/5 font-mono"
                        style={{
                          fontSize: 9,
                          background:
                            isDark ? 'hsl(var(--background) / 0.3)' : 'hsl(var(--foreground) / 0.04)',
                          color: isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))',
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

        {/* 原「常驻 HUD」已整体删除（AI 表面 S2-e）。
            内容为 `LEVEL 3 准自主` · `OPENAPI ZERO-DRIFT` · `4/5 准则闭环`——三样读起来
            像实时治理仪表，实际：信任等级字段不存在、契约漂移是 CI 构建结论而非运行时读数、
            「准则闭环」没有任何口径能算出 4/5。与表盘上方那条已删除的 HUD 同属一类形态，
            故一并清零（§4.7 不伪造：无数据就显示无数据）。 */}
      </div>
    </div>
  );
}