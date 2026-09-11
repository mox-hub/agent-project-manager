import { useState } from 'react';
import type { AgentPersona, TrustDimension, MemoryAtom, ArtifactItem, CognitiveMessage } from '../types';
import { CentralWatchDial } from './central-watch-dial';
import { cn } from '@/lib/utils';
import {
  ShieldCheck,
  Database,
  Sparkles,
  Cpu,
  Info,
  FileCode,
} from 'lucide-react';

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
  const [activeMemory, setActiveMemory] = useState<MemoryAtom | null>(null);

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

  // 几何坐标参数 (以中间 720px 表盘中心为原点 (0, 0)，表盘半径 R = 360)
  // 左侧 4 个 Agent 卡片数据与科技总线曲折走线路径
  const LEFT_CARDS_DATA = [
    {
      agent: agents[0] ?? {
        id: 'agent-pm',
        name: 'Aria',
        role: 'pm',
        roleTitle: '需求洞察与编排专家',
        avatar: '✦',
        trustScore: 98.2,
        tokensUsed: 42800,
        status: 'reasoning',
        statusText: '正在推演 CAP-P-01 任务原子拆解路径',
        activeIssue: { id: 'issue-101', key: 'APM-101', title: '需求管道自动化拆解与验收契约生成' },
        recentThought: '对比 PRD-v3 规格，当前子任务尚未覆盖离线断网恢复策略，准备补齐边界条件。',
        specialties: ['PRD解构', '工单拆解', '优先级裁决'],
      },
      pinX: -410,
      pinY: -225,
      bezelX: -278,
      bezelY: -225,
      cardLeft: -705,
      cardTop: -285,
      // 双直角阶梯曲折走线与中继节点
      circuitPath: 'M -410 -225 L -370 -225 L -370 -195 L -315 -195 L -315 -225 L -278 -225',
      nodes: [
        { x: -370, y: -225 },
        { x: -370, y: -195 },
        { x: -315, y: -195 },
        { x: -315, y: -225 },
      ],
    },
    {
      agent: agents[1] ?? {
        id: 'agent-architect',
        name: 'DaVinci',
        role: 'architect',
        roleTitle: '系统架构与契约门禁',
        avatar: '◈',
        trustScore: 96.5,
        tokensUsed: 78500,
        status: 'executing',
        statusText: '校验 openapi.json 与单库路由隔离',
        activeIssue: { id: 'issue-102', key: 'APM-102', title: '多工作区 AsyncLocalStorage 路由基线加固' },
        recentThought: '已完成 schema.prisma 实体隔离推演，准备向中央工件输出差异化变更。',
        specialties: ['OpenAPI 契约', 'SQLite单库', '领域模型建模'],
      },
      pinX: -465,
      pinY: -75,
      bezelX: -352,
      bezelY: -75,
      cardLeft: -760,
      cardTop: -135,
      circuitPath: 'M -465 -75 L -425 -75 L -425 -110 L -380 -110 L -380 -75 L -352 -75',
      nodes: [
        { x: -425, y: -75 },
        { x: -425, y: -110 },
        { x: -380, y: -110 },
        { x: -380, y: -75 },
      ],
    },
    {
      agent: agents[2] ?? {
        id: 'agent-coder',
        name: 'Nexus',
        role: 'coder',
        roleTitle: '执行核心与代码生成',
        avatar: '⚡',
        trustScore: 93.8,
        tokensUsed: 124300,
        status: 'executing',
        statusText: '渲染表盘 3D 景深与弧形视界',
        activeIssue: { id: 'issue-103', key: 'APM-103', title: 'AI 表面无边框空间悬浮流组件实现' },
        recentThought: '优化 Tailwind 4 现代玻璃质感样式，确保 120fps 硬件加速无重排。',
        specialties: ['React 19', 'Tailwind 4', 'CLI Runtime 调度'],
      },
      pinX: -465,
      pinY: 75,
      bezelX: -352,
      bezelY: 75,
      cardLeft: -760,
      cardTop: 15,
      circuitPath: 'M -465 75 L -425 75 L -425 110 L -380 110 L -380 75 L -352 75',
      nodes: [
        { x: -425, y: 75 },
        { x: -425, y: 110 },
        { x: -380, y: 110 },
        { x: -380, y: 75 },
      ],
    },
    {
      agent: agents[3] ?? {
        id: 'agent-qa',
        name: 'Sentinel',
        role: 'qa',
        roleTitle: '质量看门狗与验证引擎',
        avatar: '🛡',
        trustScore: 97.4,
        tokensUsed: 31200,
        status: 'auditing',
        statusText: '契约漂移率 0% · 门禁验证通过',
        activeIssue: { id: 'issue-104', key: 'APM-104', title: '全链路验收准则自动化审计' },
        recentThought: '目前 API 契约漂移率为 0%，未发现未经声明的原生色板违规。',
        specialties: ['Vitest', 'E2E 审计', '验收证据追溯'],
      },
      pinX: -410,
      pinY: 225,
      bezelX: -278,
      bezelY: 225,
      cardLeft: -705,
      cardTop: 165,
      circuitPath: 'M -410 225 L -370 225 L -370 195 L -315 195 L -315 225 L -278 225',
      nodes: [
        { x: -370, y: 225 },
        { x: -370, y: 195 },
        { x: -315, y: 195 },
        { x: -315, y: 225 },
      ],
    },
  ];

  // 右侧 4 个信度与属性卡片数据与科技总线曲折走线路径
  const RIGHT_CARDS_DATA = [
    {
      id: 'right-score',
      pinX: 410,
      pinY: -225,
      bezelX: 278,
      bezelY: -225,
      cardLeft: 415,
      cardTop: -285,
      circuitPath: 'M 410 -225 L 370 -225 L 370 -195 L 315 -195 L 315 -225 L 278 -225',
      nodes: [
        { x: 370, y: -225 },
        { x: 370, y: -195 },
        { x: 315, y: -195 },
        { x: 315, y: -225 },
      ],
    },
    {
      id: 'right-contract',
      pinX: 465,
      pinY: -75,
      bezelX: 352,
      bezelY: -75,
      cardLeft: 470,
      cardTop: -135,
      circuitPath: 'M 465 -75 L 425 -75 L 425 -110 L 380 -110 L 380 -75 L 352 -75',
      nodes: [
        { x: 425, y: -75 },
        { x: 425, y: -110 },
        { x: 380, y: -110 },
        { x: 380, y: -75 },
      ],
    },
    {
      id: 'right-logic',
      pinX: 465,
      pinY: 75,
      bezelX: 352,
      bezelY: 75,
      cardLeft: 470,
      cardTop: 15,
      circuitPath: 'M 465 75 L 425 75 L 425 110 L 380 110 L 380 75 L 352 75',
      nodes: [
        { x: 425, y: 75 },
        { x: 425, y: 110 },
        { x: 380, y: 110 },
        { x: 380, y: 75 },
      ],
    },
    {
      id: 'right-memory',
      pinX: 410,
      pinY: 225,
      bezelX: 278,
      bezelY: 225,
      cardLeft: 415,
      cardTop: 165,
      circuitPath: 'M 410 225 L 370 225 L 370 195 L 315 195 L 315 225 L 278 225',
      nodes: [
        { x: 370, y: 225 },
        { x: 370, y: 195 },
        { x: 315, y: 195 },
        { x: 315, y: 225 },
      ],
    },
  ];

  return (
    <div
      className="relative flex items-center justify-center select-none py-10 my-auto"
      style={{ minHeight: 840, width: '100%' }}
    >
      {/* 居中工作视界容器 (1520px 宽度，中间为 720px 表盘，上方为悬浮 HUD，左右为水平环绕卡片) */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 1520, height: 760 }}
      >
        {/* ============================================================ */}
        {/* 0. 表盘正上方悬浮 HUD (Overhead Holographic Telemetry HUD) */}
        {/* ============================================================ */}
        <div
          className="absolute z-30 flex items-center justify-between px-6 py-2.5 rounded-2xl backdrop-blur-2xl border"
          style={{
            left: 'calc(50% - 370px)',
            top: 'calc(50% - 438px)',
            width: 740,
            borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : 'rgba(99, 102, 241, 0.25)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(20, 24, 38, 0.92) 0%, rgba(10, 12, 18, 0.88) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 244, 255, 0.90) 100%)',
            boxShadow: isDark
              ? '0 16px 36px -8px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
              : '0 16px 36px -8px rgba(99, 102, 241, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          }}
        >
          {/* 左侧：主线工作流标识与自治状态 */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center size-6 rounded-lg text-white"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
              }}
            >
              <Cpu className="size-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-tight">
                  WORKSTREAM: CAP-P-01
                </span>
                <span
                  className="px-1.5 py-0.2 rounded font-mono font-semibold"
                  style={{
                    fontSize: 8.5,
                    background: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)',
                    color: '#10B981',
                  }}
                >
                  AUTONOMOUS RUNNING
                </span>
              </div>
              <p
                className="font-mono text-muted-foreground"
                style={{ fontSize: 9 }}
              >
                自动化需求管道承接 · Prisma/OpenAPI 契约生成 · Sentinel 门禁
              </p>
            </div>
          </div>

          {/* 中间：微型神经脉冲灯 */}
          <div className="hidden md:flex items-center gap-1.5 font-mono text-xs">
            <span className="size-2 rounded-full animate-ping" style={{ backgroundColor: '#10B981' }} />
            <span
              className="px-2 py-0.5 rounded-full"
              style={{
                fontSize: 9,
                background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                color: isDark ? '#DDD6FE' : '#4F46E5',
              }}
            >
              4/4 智能体神经网络同频
            </span>
          </div>

          {/* 右侧：遥测快报 */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="text-right">
              <span className="block font-bold" style={{ fontSize: 10, color: '#34D399' }}>
                142.6 t/s
              </span>
              <span className="text-muted-foreground" style={{ fontSize: 8 }}>
                吞吐速率
              </span>
            </div>
            <div className="h-5 w-px bg-current/10" />
            <div className="text-right">
              <span className="block font-bold" style={{ fontSize: 10, color: '#A78BFA' }}>
                18ms
              </span>
              <span className="text-muted-foreground" style={{ fontSize: 8 }}>
                突触延迟
              </span>
            </div>
            <div className="h-5 w-px bg-current/10" />
            <div className="text-right">
              <span className="block font-bold" style={{ fontSize: 10, color: '#F59E0B' }}>
                5/5
              </span>
              <span className="text-muted-foreground" style={{ fontSize: 8 }}>
                记忆星云
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 1. 科技总线曲折线 SVG 连线层 (Stepped Circuit Zig-Zag Cables) */}
        {/* ============================================================ */}
        <svg
          className="pointer-events-none absolute inset-0 size-full overflow-visible z-10"
          viewBox="-760 -380 1520 760"
        >
          <defs>
            <linearGradient id="wireGlowLeft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="wireGlowRight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* 左侧曲折接线：连接 4 个水平 Agent 卡片端子到表盘外壳 */}
          {LEFT_CARDS_DATA.map((item, idx) => {
            const isHovered = hoveredSideCard === item.agent.id || selectedAgentId === item.agent.id;

            return (
              <g key={`wire-left-${idx}`}>
                {/* 基础物理电路母线 (带直角圆滑拐角) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke={
                    isHovered
                      ? isDark
                        ? 'rgba(139, 92, 246, 0.85)'
                        : 'rgba(99, 102, 241, 0.85)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(15, 23, 42, 0.22)'
                  }
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 闪光高能激光脉冲 (沿曲折线向表盘流动) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke="url(#wireGlowLeft)"
                  strokeWidth={isHovered ? 3.5 : 2.2}
                  strokeDasharray="12 28"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 6px rgba(52, 211, 153, 0.8))'
                      : 'drop-shadow(0 0 4px rgba(99, 102, 241, 0.6))',
                  }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="40"
                    to="0"
                    dur={isHovered ? '0.8s' : `${1.5 + idx * 0.2}s`}
                    repeatCount="indefinite"
                  />
                </path>

                {/* 曲折走线上的微型焊点中继晶体 (Circuit Junction Nodes) */}
                {item.nodes.map((node, nIdx) => (
                  <circle
                    key={`node-l-${idx}-${nIdx}`}
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? 3 : 2}
                    fill={isDark ? '#A78BFA' : '#6366F1'}
                    opacity={0.85}
                  />
                ))}

                {/* 卡片端子接线引脚 (Pin) */}
                <circle cx={item.pinX} cy={item.pinY} r="4" fill="#8B5CF6" />
                <circle cx={item.pinX} cy={item.pinY} r="1.8" fill="#FFFFFF" />

                {/* 表盘外壳接线座 (Bezel Socket) */}
                <circle cx={item.bezelX} cy={item.bezelY} r="4.5" fill="#34D399" />
                <circle cx={item.bezelX} cy={item.bezelY} r="2" fill="#FFFFFF" />
              </g>
            );
          })}

          {/* 右侧曲折接线：连接 4 个水平信度卡片端子到表盘外壳 */}
          {RIGHT_CARDS_DATA.map((item, idx) => {
            const isHovered = hoveredSideCard === item.id;

            return (
              <g key={`wire-right-${idx}`}>
                {/* 基础物理电路母线 (带直角圆滑拐角) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke={
                    isHovered
                      ? isDark
                        ? 'rgba(52, 211, 153, 0.85)'
                        : 'rgba(16, 185, 129, 0.85)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.22)'
                      : 'rgba(15, 23, 42, 0.22)'
                  }
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* 闪光高能激光脉冲 (沿曲折线向表盘流动) */}
                <path
                  d={item.circuitPath}
                  fill="none"
                  stroke="url(#wireGlowRight)"
                  strokeWidth={isHovered ? 3.5 : 2.2}
                  strokeDasharray="12 28"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: isDark
                      ? 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.8))'
                      : 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.6))',
                  }}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="40"
                    dur={isHovered ? '0.8s' : `${1.6 + idx * 0.2}s`}
                    repeatCount="indefinite"
                  />
                </path>

                {/* 曲折走线上的微型焊点中继晶体 (Circuit Junction Nodes) */}
                {item.nodes.map((node, nIdx) => (
                  <circle
                    key={`node-r-${idx}-${nIdx}`}
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? 3 : 2}
                    fill={isDark ? '#34D399' : '#10B981'}
                    opacity={0.85}
                  />
                ))}

                {/* 卡片端子接线引脚 (Pin) */}
                <circle cx={item.pinX} cy={item.pinY} r="4" fill="#34D399" />
                <circle cx={item.pinX} cy={item.pinY} r="1.8" fill="#FFFFFF" />

                {/* 表盘外壳接线座 (Bezel Socket) */}
                <circle cx={item.bezelX} cy={item.bezelY} r="4.5" fill="#8B5CF6" />
                <circle cx={item.bezelX} cy={item.bezelY} r="2" fill="#FFFFFF" />
              </g>
            );
          })}
        </svg>

        {/* ============================================================ */}
        {/* 2. 左侧 4 个水平 Agent 卡片 (保持原有丰富信息状态，水平向心排列) */}
        {/* ============================================================ */}
        {LEFT_CARDS_DATA.map((item) => {
          const isSelected = selectedAgentId === item.agent.id;
          const isHovered = hoveredSideCard === item.agent.id;

          return (
            <div
              key={item.agent.id}
              onClick={() => onSelectAgent(item.agent.id)}
              onMouseEnter={() => setHoveredSideCard(item.agent.id)}
              onMouseLeave={() => setHoveredSideCard(null)}
              className={cn(
                'absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border cursor-pointer select-text',
                isSelected ? 'shadow-xl' : 'hover:opacity-95',
              )}
              style={{
                left: `calc(50% + ${item.cardLeft}px)`,
                top: `calc(50% + ${item.cardTop}px)`,
                width: 295,
                borderColor: isSelected
                  ? isDark
                    ? 'rgba(139, 92, 246, 0.7)'
                    : 'rgba(99, 102, 241, 0.6)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(15, 23, 42, 0.12)',
                background: isDark
                  ? isSelected
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 100%)'
                  : isSelected
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 244, 255, 0.92) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
                boxShadow: isSelected
                  ? isDark
                    ? '0 14px 34px -6px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    : '0 14px 34px -6px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  : isHovered
                  ? isDark
                    ? '0 10px 26px -4px rgba(0, 0, 0, 0.6)'
                    : '0 10px 24px -4px rgba(30, 41, 59, 0.12)'
                  : 'none',
                color: isDark ? '#FFFFFF' : '#0F172A',
              }}
            >
              {/* 顶部行：头像、呼吸指示灯、角色名称与大写Badge、信度分 */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="relative flex items-center justify-center size-8 rounded-xl font-bold text-xs shrink-0 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                      boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    {item.agent.avatar}
                    <span
                      className="absolute -top-0.5 -right-0.5 size-2 rounded-full"
                      style={{
                        backgroundColor:
                          item.agent.status === 'executing'
                            ? '#10B981'
                            : item.agent.status === 'reasoning'
                            ? '#A855F7'
                            : item.agent.status === 'auditing'
                            ? '#F59E0B'
                            : '#64748B',
                        boxShadow: '0 0 6px rgba(52, 211, 153, 0.8)',
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs tracking-tight truncate">{item.agent.name}</h4>
                      <span
                        className="px-1.5 py-0.2 rounded font-mono font-semibold"
                        style={{
                          fontSize: 8.5,
                          background: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.12)',
                          color: isDark ? '#DDD6FE' : '#4F46E5',
                        }}
                      >
                        {item.agent.role.toUpperCase()}
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

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold block" style={{ fontSize: 11, color: '#10B981' }}>
                    {item.agent.trustScore}%
                  </span>
                  <span
                    className="font-mono block"
                    style={{
                      fontSize: 8,
                      color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.45)',
                    }}
                  >
                    信度
                  </span>
                </div>
              </div>

              {/* 活跃工单 / 需求标识 */}
              {item.agent.activeIssue && (
                <div
                  className="mb-1.5 px-2 py-0.5 rounded flex items-center gap-1.5 truncate border border-current/10"
                  style={{
                    fontSize: 8.5,
                    background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <FileCode className="size-2.5 text-accent-purple shrink-0" />
                  <span className="font-mono font-semibold text-accent-purple shrink-0">
                    {item.agent.activeIssue.key}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {item.agent.activeIssue.title}
                  </span>
                </div>
              )}

              {/* 实时状态描述 */}
              <p
                className="truncate font-mono mb-1.5"
                style={{
                  fontSize: 9,
                  color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 23, 42, 0.8)',
                }}
              >
                {item.agent.statusText}
              </p>

              {/* 最近深度思考展开 (保持原有思考状态) */}
              {item.agent.recentThought && (
                <div
                  className="p-1.5 rounded-lg mb-1.5 leading-relaxed font-mono border border-current/10 line-clamp-2"
                  style={{
                    fontSize: 8.5,
                    background: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.03)',
                    color: isDark ? '#E2E8F0' : '#334155',
                  }}
                  title={item.agent.recentThought}
                >
                  <span style={{ color: '#A78BFA' }}>思考: </span>
                  {item.agent.recentThought}
                </div>
              )}

              {/* 专长技能标签组 */}
              <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-current/10">
                <div className="flex flex-wrap gap-1">
                  {item.agent.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="px-1.5 py-0.2 rounded font-mono"
                      style={{
                        fontSize: 8,
                        background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                        color: isDark ? '#CBD5E1' : '#475569',
                      }}
                    >
                      #{spec}
                    </span>
                  ))}
                </div>
                <span
                  className="font-mono shrink-0"
                  style={{
                    fontSize: 8,
                    color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.45)',
                  }}
                >
                  {(item.agent.tokensUsed / 1000).toFixed(1)}k tokens
                </span>
              </div>
            </div>
          );
        })}

        {/* ============================================================ */}
        {/* 3. 中间圆形精密手表表盘 (放大至 720px Central Watch Dial) */}
        {/* ============================================================ */}
        <div className="z-20">
          <CentralWatchDial
            artifacts={artifacts}
            messages={messages}
            isDark={isDark}
            onApproveWorkstream={onApproveWorkstream}
          />
        </div>

        {/* ============================================================ */}
        {/* 4. 右侧 4 个水平信度与记忆卡片 (保持原有丰富信息状态，水平向心排列) */}
        {/* ============================================================ */}
        {/* 卡片 1：项目信度总分 (95.4 / Level 3 准自主) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-score')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[0].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[0].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-8 rounded-xl text-white font-mono font-bold text-xs"
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
                    fontSize: 8.5,
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
                多维加权模型
              </span>
            </div>
          </div>

          {/* 4 维微型度量雷达矩阵 */}
          <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-current/10 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 8.5, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)' }}>
                契约合规
              </span>
              <span className="font-bold" style={{ fontSize: 9, color: '#10B981' }}>
                99.2%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 8.5, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)' }}>
                逻辑完备
              </span>
              <span className="font-bold" style={{ fontSize: 9, color: '#34D399' }}>
                94.5%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 8.5, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)' }}>
                幻觉抑制
              </span>
              <span className="font-bold" style={{ fontSize: 9, color: '#A78BFA' }}>
                97.0%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 8.5, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.6)' }}>
                Token ROI
              </span>
              <span className="font-bold" style={{ fontSize: 9, color: '#F59E0B' }}>
                92.8%
              </span>
            </div>
          </div>
        </div>

        {/* 卡片 2：契约合规率 (OpenAPI 99.2%) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-contract')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[1].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[1].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-xs">{contractDim.label} (OpenAPI)</span>
            <span className="font-mono font-bold" style={{ color: '#10B981', fontSize: 11 }}>
              {contractDim.score.toFixed(1)}%
            </span>
          </div>
          <div
            className="h-1.5 w-full rounded-full overflow-hidden mb-1.5"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (contractDim.score / contractDim.maxScore) * 100)}%`,
                background: 'linear-gradient(90deg, #10B981, #34D399)',
              }}
            />
          </div>
          <div className="flex items-center justify-between font-mono mb-1" style={{ fontSize: 8.5 }}>
            <span className="text-accent-purple font-semibold">ZERO DRIFT 零漂移</span>
            <span style={{ color: '#10B981' }}>单库隔离路由生效</span>
          </div>
          <p
            className="font-mono text-muted-foreground truncate"
            style={{ fontSize: 8.5 }}
          >
            openapi.json ↔ schema.prisma 实体隔离推演完毕
          </p>
        </div>

        {/* 卡片 3：逻辑完备度与 Token ROI */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-logic')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[2].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[2].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="grid grid-cols-2 gap-2 text-xs mb-1.5">
            <div>
              <span
                className="block font-mono"
                style={{
                  fontSize: 8.5,
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
                  fontSize: 8.5,
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
          <div className="flex items-center gap-1 text-muted-foreground font-mono mb-0.5" style={{ fontSize: 8.5 }}>
            <Sparkles className="size-2.5" style={{ color: '#FCD34D' }} />
            <span>无幻觉风险 · 有效代码行高密度产出</span>
          </div>
          <p
            className="font-mono truncate"
            style={{
              fontSize: 8.5,
              color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
            }}
          >
            上下文损耗 0% · PRD 边界与异常分支完全闭合
          </p>
        </div>

        {/* 卡片 4：治理记忆星云原子 (Memory Atoms - 支持展开交互) */}
        <div
          onMouseEnter={() => setHoveredSideCard('right-memory')}
          onMouseLeave={() => setHoveredSideCard(null)}
          className="absolute rounded-2xl p-3.5 backdrop-blur-2xl transition-all duration-300 border select-text"
          style={{
            left: `calc(50% + ${RIGHT_CARDS_DATA[3].cardLeft}px)`,
            top: `calc(50% + ${RIGHT_CARDS_DATA[3].cardTop}px)`,
            width: 295,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Database className="size-3 text-accent-purple" />
              <span className="font-bold text-xs">治理记忆星云原子</span>
            </div>
            <span
              className="font-mono"
              style={{
                fontSize: 8.5,
                color: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.45)',
              }}
            >
              {memoryAtoms.length} ATOMS ACTIVE
            </span>
          </div>

          {/* 全部记忆原子标签列表 */}
          <div className="flex flex-wrap gap-1">
            {memoryAtoms.map((atom) => (
              <button
                key={atom.id}
                type="button"
                onClick={() => setActiveMemory(activeMemory?.id === atom.id ? null : atom)}
                className="px-1.5 py-0.5 rounded font-mono transition-colors text-left cursor-pointer"
                style={{
                  fontSize: 8.5,
                  background:
                    activeMemory?.id === atom.id
                      ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.07)'
                      : 'rgba(99, 102, 241, 0.08)',
                  color:
                    activeMemory?.id === atom.id
                      ? '#FFFFFF'
                      : isDark
                      ? '#CBD5E1'
                      : '#4338CA',
                }}
                title={atom.summary}
              >
                #{atom.key}
              </button>
            ))}
          </div>

          {/* 点击展开的记忆原子详情 */}
          {activeMemory && (
            <div
              className="mt-1.5 p-1.5 rounded-lg leading-relaxed border border-current/10 animate-in fade-in duration-150"
              style={{
                fontSize: 8.5,
                background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.9)',
              }}
            >
              <div className="flex items-center gap-1 text-accent-purple font-mono mb-0.5">
                <Info className="size-2.5" />
                <span>权重 {(activeMemory.weight * 100).toFixed(0)}%</span>
                <span className="text-muted-foreground">·</span>
                <span>{activeMemory.category}</span>
              </div>
              <p className="text-muted-foreground">{activeMemory.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}