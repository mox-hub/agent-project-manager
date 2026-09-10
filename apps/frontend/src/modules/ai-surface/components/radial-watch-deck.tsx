import { useState } from 'react';
import type { AgentPersona, TrustDimension, MemoryAtom, ArtifactItem, CognitiveMessage } from '../types';
import { CentralWatchDial } from './central-watch-dial';
import { cn } from '@/lib/utils';
import { ShieldCheck, Database } from 'lucide-react';

interface RadialWatchDeckProps {
  agents: AgentPersona[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  dimensions: TrustDimension[];
  memoryAtoms: MemoryAtom[];
  overallScore: number;
  artifacts: Record<string, ArtifactItem>;
  messages: CognitiveMessage[];
  isDark?: boolean;
  onApproveWorkstream?: (issueKey: string) => void;
}

export function RadialWatchDeck({
  agents,
  selectedAgentId,
  onSelectAgent,
  dimensions,
  memoryAtoms,
  overallScore,
  artifacts,
  messages,
  isDark = true,
  onApproveWorkstream,
}: RadialWatchDeckProps) {
  const [hoveredSideCard, setHoveredSideCard] = useState<string | null>(null);

  const contractDim = dimensions.find((d) => d.id === 'contract' || d.label.includes('契约')) ?? {
    id: 'contract',
    label: '契约合规率',
    score: 99.2,
    maxScore: 100,
  };
  const logicDim = dimensions.find((d) => d.id === 'logic' || d.label.includes('完备')) ?? {
    id: 'logic',
    label: '逻辑完备度',
    score: 94.5,
    maxScore: 100,
  };
  const tokenDim = dimensions.find((d) => d.id === 'cost' || d.label.includes('Token') || d.label.includes('产出')) ?? {
    id: 'cost',
    label: 'Token 产出比',
    score: 92.8,
    maxScore: 100,
  };

  // 几何坐标参数 (以中间表盘中心为原点 (0, 0)，表盘半径 R = 310)
  // 左侧 4 个 Agent 卡片的 Y 坐标与 X 锚点
  const LEFT_CARDS_DATA = [
    {
      agent: agents[0] ?? { id: 'agent-pm', name: 'Aria', roleTitle: '需求洞察与编排 (PM)', avatar: '✦', trustScore: 98.2, statusText: '正在拆解主线需求 CAP-P-01' },
      pinX: -340,
      pinY: -195,
      bezelX: -241,
      bezelY: -195,
      cardLeft: -600,
      cardTop: -237,
    },
    {
      agent: agents[1] ?? { id: 'agent-architect', name: 'DaVinci', roleTitle: '系统架构与契约 (Arch)', avatar: '◈', trustScore: 96.5, statusText: '校验 openapi.json 与单库路由' },
      pinX: -400,
      pinY: -65,
      bezelX: -303,
      bezelY: -65,
      cardLeft: -660,
      cardTop: -107,
    },
    {
      agent: agents[2] ?? { id: 'agent-coder', name: 'Nexus', roleTitle: '执行核心与代码 (Coder)', avatar: '⚡', trustScore: 93.8, statusText: '渲染表盘 3D 景深与弧形视界' },
      pinX: -400,
      pinY: 65,
      bezelX: -303,
      bezelY: 65,
      cardLeft: -660,
      cardTop: 23,
    },
    {
      agent: agents[3] ?? { id: 'agent-qa', name: 'Sentinel', roleTitle: '质量门禁与验证 (QA)', avatar: '🛡', trustScore: 97.4, statusText: '契约漂移率 0% · 门禁验证通过' },
      pinX: -340,
      pinY: 195,
      bezelX: -241,
      bezelY: 195,
      cardLeft: -600,
      cardTop: 153,
    },
  ];

  // 右侧 4 个信度与属性卡片的 Y 坐标与 X 锚点
  const RIGHT_CARDS_DATA = [
    {
      id: 'right-score',
      pinX: 340,
      pinY: -195,
      bezelX: 241,
      bezelY: -195,
      cardLeft: 340,
      cardTop: -237,
    },
    {
      id: 'right-contract',
      pinX: 400,
      pinY: -65,
      bezelX: 303,
      bezelY: -65,
      cardLeft: 400,
      cardTop: -107,
    },
    {
      id: 'right-logic',
      pinX: 400,
      pinY: 65,
      bezelX: 303,
      bezelY: 65,
      cardLeft: 400,
      cardTop: 23,
    },
    {
      id: 'right-memory',
      pinX: 340,
      pinY: 195,
      bezelX: 241,
      bezelY: 195,
      cardLeft: 340,
      cardTop: 153,
    },
  ];

  return (
    <div className="relative flex items-center justify-center select-none py-6 my-auto" style={{ minHeight: 700, width: '100%' }}>
      {/* 居中工作视界容器 (1360px 宽度，中间为表盘，左右为水平环绕卡片) */}
      <div className="relative flex items-center justify-center" style={{ width: 1360, height: 660 }}>
        {/* 1. 闪光接线 SVG 连线层 (Connecting Cables Layer) */}
        <svg
          className="pointer-events-none absolute inset-0 size-full overflow-visible z-10"
          viewBox="-680 -330 1360 660"
        >
          <defs>
            <linearGradient id="wireGlowLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="wireGlowRight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* 左侧接线：连接 4 个水平 Agent 卡片端子到表盘外壳 */}
          {LEFT_CARDS_DATA.map((item, idx) => {
            const isHovered = hoveredSideCard === item.agent.id || selectedAgentId === item.agent.id;
            const pathData = `M ${item.pinX} ${item.pinY} C ${item.pinX + 40} ${item.pinY}, ${item.bezelX - 40} ${item.bezelY}, ${item.bezelX} ${item.bezelY}`;

            return (
              <g key={`wire-left-${idx}`}>
                {/* 基础物理光缆导线 */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={
                    isHovered
                      ? isDark
                        ? 'rgba(139, 92, 246, 0.8)'
                        : 'rgba(99, 102, 241, 0.8)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'rgba(15, 23, 42, 0.18)'
                  }
                  strokeWidth={isHovered ? 2 : 1.2}
                />

                {/* 闪光高能激光脉冲 (向表盘流动) */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="url(#wireGlowLeft)"
                  strokeWidth={isHovered ? 3 : 2}
                  strokeDasharray="10 32"
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.8))'
                      : 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
                  }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="42"
                    to="0"
                    dur={isHovered ? '0.9s' : `${1.6 + idx * 0.3}s`}
                    repeatCount="indefinite"
                  />
                </path>

                {/* 卡片端子接线点 */}
                <circle cx={item.pinX} cy={item.pinY} r="3.5" fill="#8B5CF6" />
                <circle cx={item.pinX} cy={item.pinY} r="1.5" fill="#FFFFFF" />

                {/* 表盘外壳接线座 */}
                <circle cx={item.bezelX} cy={item.bezelY} r="4" fill="#34D399" />
                <circle cx={item.bezelX} cy={item.bezelY} r="2" fill="#FFFFFF" />
              </g>
            );
          })}

          {/* 右侧接线：连接 4 个水平信度卡片端子到表盘外壳 */}
          {RIGHT_CARDS_DATA.map((item, idx) => {
            const isHovered = hoveredSideCard === item.id;
            const pathData = `M ${item.pinX} ${item.pinY} C ${item.pinX - 40} ${item.pinY}, ${item.bezelX + 40} ${item.bezelY}, ${item.bezelX} ${item.bezelY}`;

            return (
              <g key={`wire-right-${idx}`}>
                {/* 基础物理导线 */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={
                    isHovered
                      ? isDark
                        ? 'rgba(52, 211, 153, 0.8)'
                        : 'rgba(16, 185, 129, 0.8)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.18)'
                      : 'rgba(15, 23, 42, 0.18)'
                  }
                  strokeWidth={isHovered ? 2 : 1.2}
                />

                {/* 闪光高能激光脉冲 (向表盘流动) */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="url(#wireGlowRight)"
                  strokeWidth={isHovered ? 3 : 2}
                  strokeDasharray="10 32"
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.8))'
                      : 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.6))',
                  }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="42"
                    dur={isHovered ? '0.9s' : `${1.7 + idx * 0.25}s`}
                    repeatCount="indefinite"
                  />
                </path>

                {/* 卡片端子接线点 */}
                <circle cx={item.pinX} cy={item.pinY} r="3.5" fill="#34D399" />
                <circle cx={item.pinX} cy={item.pinY} r="1.5" fill="#FFFFFF" />

                {/* 表盘外壳接线座 */}
                <circle cx={item.bezelX} cy={item.bezelY} r="4" fill="#8B5CF6" />
                <circle cx={item.bezelX} cy={item.bezelY} r="2" fill="#FFFFFF" />
              </g>
            );
          })}
        </svg>

        {/* 2. 左侧 4 个水平 Agent 卡片 (保持水平，围绕表盘半圆环绕) */}
        {LEFT_CARDS_DATA.map((item) => {
          const isSelected = selectedAgentId === item.agent.id;
          const isHovered = hoveredSideCard === item.agent.id;

          return (
            <div
              key={item.agent.id}
              onMouseEnter={() => setHoveredSideCard(item.agent.id)}
              onMouseLeave={() => setHoveredSideCard(null)}
              onClick={() => onSelectAgent(item.agent.id)}
              className={cn(
                'absolute rounded-2xl p-3 backdrop-blur-2xl transition-all duration-300 cursor-pointer border',
                isSelected ? 'shadow-xl' : 'hover:opacity-95',
              )}
              style={{
                left: `calc(50% + ${item.cardLeft}px)`,
                top: `calc(50% + ${item.cardTop}px)`,
                width: 255,
                borderColor: isSelected
                  ? isDark
                    ? 'rgba(139, 92, 246, 0.6)'
                    : 'rgba(99, 102, 241, 0.5)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(15, 23, 42, 0.1)',
                background: isDark
                  ? isSelected
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : isSelected
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(240, 244, 255, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
                boxShadow: isSelected
                  ? isDark
                    ? '0 12px 30px -6px rgba(139, 92, 246, 0.35)'
                    : '0 12px 30px -6px rgba(99, 102, 241, 0.2)'
                  : isHovered
                  ? isDark
                    ? '0 8px 24px -4px rgba(0, 0, 0, 0.5)'
                    : '0 8px 20px -4px rgba(30, 41, 59, 0.1)'
                  : 'none',
                color: isDark ? '#FFFFFF' : '#0F172A',
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center size-7 rounded-xl font-bold text-xs shrink-0 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                      boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    {item.agent.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs tracking-tight">{item.agent.name}</h4>
                      <span
                        className="px-1.5 py-0.2 rounded font-mono font-semibold"
                        style={{
                          fontSize: 9,
                          background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.12)',
                          color: isDark ? '#DDD6FE' : '#4F46E5',
                        }}
                      >
                        {item.agent.trustScore}%
                      </span>
                    </div>
                    <p
                      className="truncate font-mono"
                      style={{
                        fontSize: 9,
                        color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(15, 23, 42, 0.6)',
                      }}
                    >
                      {item.agent.roleTitle}
                    </p>
                  </div>
                </div>

                <div
                  className="size-2 rounded-full shrink-0"
                  style={{
                    background: '#34D399',
                    boxShadow: '0 0 8px #34D399',
                  }}
                />
              </div>

              {/* 思维回响微标签 */}
              <p
                className="truncate font-mono"
                style={{
                  fontSize: 9,
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
                }}
              >
                {item.agent.statusText}
              </p>
            </div>
          );
        })}

        {/* 3. 中间圆形手表表盘 (Central Watch Chrono-Dial) */}
        <div className="z-20">
          <CentralWatchDial
            artifacts={artifacts}
            messages={messages}
            isDark={isDark}
            onApproveWorkstream={onApproveWorkstream}
          />
        </div>

        {/* 4. 右侧 4 个水平信度与记忆卡片 (保持水平，围绕表盘半圆环绕) */}
        {/* 卡片 1：项目信度总分 (95.4 / Level 3 准自主) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-score')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3 backdrop-blur-2xl transition-all duration-300 border"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[0].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[0].cardTop}px)`,
            width: 255,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-7 rounded-xl text-white font-mono font-bold text-xs"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                }}
              >
                {overallScore.toFixed(0)}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs tracking-tight">项目信度总分</span>
                  <ShieldCheck className="size-3" style={{ color: '#34D399' }} />
                </div>
                <span
                  className="px-1.5 py-0.2 rounded font-mono font-semibold"
                  style={{
                    fontSize: 9,
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#10B981',
                  }}
                >
                  LEVEL 3 准自主
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono font-bold block" style={{ fontSize: 13, color: '#10B981' }}>
                {overallScore.toFixed(1)}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 8,
                  color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.5)',
                }}
              >
                加权模型
              </span>
            </div>
          </div>
        </div>

        {/* 卡片 2：契约合规率 (OpenAPI 99.2%) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-contract')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3 backdrop-blur-2xl transition-all duration-300 border"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[1].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[1].cardTop}px)`,
            width: 255,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-xs">{contractDim.label} (OpenAPI)</span>
            <span className="font-mono font-bold" style={{ color: '#10B981', fontSize: 11 }}>
              {contractDim.score.toFixed(1)}%
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full overflow-hidden mb-1"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, (contractDim.score / contractDim.maxScore) * 100)}%`, background: 'linear-gradient(90deg, #10B981, #34D399)' }}
            />
          </div>
          <p
            className="font-mono truncate"
            style={{
              fontSize: 9,
              color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
            }}
          >
            ZERO DRIFT · 单库隔离路由完全生效
          </p>
        </div>

        {/* 卡片 3：逻辑完备度与 Token ROI */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-logic')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3 backdrop-blur-2xl transition-all duration-300 border"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[2].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[2].cardTop}px)`,
            width: 255,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span
                className="block font-mono"
                style={{
                  fontSize: 9,
                  color: isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.55)',
                }}
              >
                {logicDim.label}
              </span>
              <span className="font-mono font-bold" style={{ fontSize: 11, color: '#34D399' }}>
                {logicDim.score.toFixed(1)}%
              </span>
            </div>
            <div>
              <span
                className="block font-mono"
                style={{
                  fontSize: 9,
                  color: isDark ? 'rgba(255, 255, 255, 0.55)' : 'rgba(15, 23, 42, 0.55)',
                }}
              >
                {tokenDim.label}
              </span>
              <span className="font-mono font-bold" style={{ fontSize: 11, color: '#A78BFA' }}>
                {tokenDim.score.toFixed(1)}%
              </span>
            </div>
          </div>
          <p
            className="mt-1 font-mono truncate"
            style={{
              fontSize: 9,
              color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
            }}
          >
            有效代码行高密度，上下文零损耗
          </p>
        </div>

        {/* 卡片 4：治理记忆星云原子 (Memory Atoms) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-memory')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3 backdrop-blur-2xl transition-all duration-300 border"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[3].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[3].cardTop}px)`,
            width: 255,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Database className="size-3 text-accent-purple" />
            <span className="font-bold text-xs">治理记忆星云原子</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {memoryAtoms.slice(0, 4).map((atom) => (
              <span
                key={atom.id}
                className="px-1.5 py-0.2 rounded font-mono truncate"
                style={{
                  fontSize: 8,
                  background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                  color: isDark ? '#E2E8F0' : '#334155',
                  maxWidth: 110,
                }}
              >
                {atom.key}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}