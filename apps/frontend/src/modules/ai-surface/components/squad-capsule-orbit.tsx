import { useState, useEffect } from 'react';
import type { AgentPersona, ActivityBubble } from '../types';
import { cn } from '@/lib/utils';
import { Brain, Cpu, Shield, Sparkles, Activity } from 'lucide-react';

interface SquadCapsuleOrbitProps {
  agents: AgentPersona[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  isDark?: boolean;
}

// 4个 Agent 对应手表外侧弧度的角度分布 (从上到下)
const ARC_ANGLES = [-34, -11, 11, 34];

export function SquadCapsuleOrbit({
  agents,
  selectedAgentId,
  onSelectAgent,
  isDark = true,
}: SquadCapsuleOrbitProps) {
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<ActivityBubble[]>([]);

  // 模拟生命感：每隔一段时间随机让一个 Agent 吐出思维气泡
  useEffect(() => {
    const emitterPhrases = [
      { agentId: 'agent-pm', text: '正在拆解主线需求 CAP-P-01' },
      { agentId: 'agent-architect', text: '校验 OpenAPI 契约无漂移' },
      { agentId: 'agent-coder', text: '编译通过，组件硬件加速就绪' },
      { agentId: 'agent-qa', text: '门禁审计通过率 100%' },
      { agentId: 'agent-coder', text: '生成 Issue 原子任务卡片' },
      { agentId: 'agent-pm', text: '对齐架构设计真相源' },
    ];

    const interval = setInterval(() => {
      const randomItem = emitterPhrases[Math.floor(Math.random() * emitterPhrases.length)];
      const newBubble: ActivityBubble = {
        id: `bubble-${Date.now()}`,
        agentId: randomItem.agentId,
        text: randomItem.text,
        timestamp: Date.now(),
        type: 'info',
      };

      setBubbles((prev) => [...prev.slice(-3), newBubble]);

      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, 4200);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getRoleIcon = (role: AgentPersona['role']) => {
    switch (role) {
      case 'pm':
        return Sparkles;
      case 'architect':
        return Brain;
      case 'coder':
        return Cpu;
      case 'qa':
        return Shield;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="relative select-none flex items-center" style={{ width: 340, height: 600 }}>
      {/* 1. 手表外侧弧形刻度导轨 SVG (Watch-Dial Outer Bezel Track) */}
      <svg
        className="pointer-events-none absolute left-0 top-0 size-full overflow-visible opacity-50"
        viewBox="0 0 340 600"
      >
        {/* 外圆弧导轨 */}
        <path
          d="M 50 40 A 540 540 0 0 1 50 560"
          fill="none"
          stroke={isDark ? 'hsl(var(--accent-purple) / 0.25)' : 'hsl(var(--accent-purple) / 0.25)'}
          strokeWidth="2"
          strokeDasharray="4 8"
        />
        {/* 内圆弧导轨 */}
        <path
          d="M 70 70 A 500 500 0 0 1 70 530"
          fill="none"
          stroke={isDark ? 'hsl(var(--foreground) / 0.1)' : 'hsl(var(--foreground) / 0.1)'}
          strokeWidth="1"
        />
        {/* 表盘刻度点 (Watch Ticks) */}
        {[-38, -25, -12, 0, 12, 25, 38].map((angle, idx) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 50 + 520 * (1 - Math.cos(rad)) * 0.4;
          const cy = 300 + 520 * Math.sin(rad) * 0.48;
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={angle === 0 ? 3 : 2}
              fill={isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))'}
              opacity={angle === 0 ? 0.9 : 0.4}
            />
          );
        })}
      </svg>

      {/* 顶部标签 */}
      <div
        className="absolute top-2 left-6 flex items-center gap-1.5 font-mono uppercase tracking-widest text-muted-foreground/70"
        style={{ fontSize: 10 }}
      >
        <Activity className="size-3 text-accent-purple" />
        <span>SQUAD ARC / 角色表圈</span>
      </div>

      {/* 2. 呈半圆弧分布的 Agent 胶囊卡片 */}
      <div className="relative size-full flex flex-col justify-center">
        {agents.map((agent, index) => {
          const angle = ARC_ANGLES[index] ?? 0;
          // 计算沿圆弧的偏移位置 (向右突出)
          const rad = (angle * Math.PI) / 180;
          const offsetX = Math.cos(rad) * 60 - 20; // 弧度凸起位移
          const rotateDeg = angle * 0.45; // 胶囊微角度倾斜

          const isSelected = selectedAgentId === agent.id;
          const isHovered = hoveredAgentId === agent.id;
          const RoleIcon = getRoleIcon(agent.role);
          const activeAgentBubbles = bubbles.filter((b) => b.agentId === agent.id);

          return (
            <div
              key={agent.id}
              className="relative transition-transform duration-300 ease-out my-2.5"
              style={{
                transform: `translate3d(${offsetX}px, 0, 0) rotate(${rotateDeg}deg)`,
                transformOrigin: 'left center',
                zIndex: isSelected || isHovered ? 30 : 10,
              }}
            >
              {/* 弧形外接刻度标线 */}
              <div
                className="absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-0.5 pointer-events-none opacity-40"
                style={{ background: isDark ? 'hsl(var(--accent-purple))' : 'hsl(var(--accent-purple))' }}
              />

              {/* 胶囊卡片 */}
              <button
                type="button"
                onClick={() => onSelectAgent(agent.id)}
                onMouseEnter={() => setHoveredAgentId(agent.id)}
                onMouseLeave={() => setHoveredAgentId(null)}
                className={cn(
                  'relative w-64 text-left rounded-2xl p-3 transition-all duration-300 ease-out backdrop-blur-2xl shadow-xs cursor-pointer',
                  isSelected ? 'scale-105' : 'hover:translate-x-1',
                )}
                style={{
                  background: isDark
                    ? isSelected
                      ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.14) 0%, hsl(var(--foreground) / 0.05) 100%)'
                      : 'linear-gradient(135deg, hsl(var(--foreground) / 0.07) 0%, hsl(var(--foreground) / 0.02) 100%)'
                    : isSelected
                    ? 'linear-gradient(135deg, hsl(var(--background) / 0.95) 0%, hsl(var(--background) / 0.9) 100%)'
                    : 'linear-gradient(135deg, hsl(var(--background) / 0.82) 0%, hsl(var(--background) / 0.75) 100%)',
                  color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
                }}
              >
                {/* 顶部行：角色头像、呼吸状态灯、信度刻度 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="relative flex items-center justify-center size-8 rounded-xl shrink-0 text-primary-foreground"
                      style={{
                        background:
                          'linear-gradient(135deg, hsl(var(--accent-purple)) 0%, hsl(var(--accent-purple)) 100%)',
                      }}
                    >
                      <RoleIcon className="size-4 text-primary-foreground" />
                      {/* 呼吸状态小光球 */}
                      <span
                        className="absolute -top-0.5 -right-0.5 size-2 rounded-full"
                        style={{
                          backgroundColor:
                            agent.status === 'executing'
                              ? 'hsl(var(--accent-green))'
                              : agent.status === 'reasoning'
                              ? 'hsl(var(--accent-purple))'
                              : agent.status === 'auditing'
                              ? 'hsl(var(--accent-yellow))'
                              : 'hsl(var(--muted-foreground))',
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold truncate">
                          {agent.name}
                        </span>
                        <span
                          className="px-1 py-0.2 rounded font-mono"
                          style={{
                            fontSize: 9,
                            background:
                              isDark ? 'hsl(var(--foreground) / 0.1)' : 'hsl(var(--accent-purple) / 0.1)',
                            color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--accent-purple))',
                          }}
                        >
                          {agent.role.toUpperCase()}
                        </span>
                      </div>
                      <p
                        className="truncate"
                        style={{
                          fontSize: 10,
                          color: isDark ? 'hsl(var(--foreground) / 0.55)' : 'hsl(var(--foreground) / 0.6)',
                        }}
                      >
                        {agent.roleTitle}
                      </p>
                    </div>
                  </div>

                  {/* 表盘刻度数值 */}
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold" style={{ fontSize: 11, color: 'hsl(var(--accent-green))' }}>
                      {agent.trustScore}%
                    </span>
                    <p
                      className="font-mono"
                      style={{
                        fontSize: 9,
                        color: isDark ? 'hsl(var(--foreground) / 0.4)' : 'hsl(var(--foreground) / 0.45)',
                      }}
                    >
                      信度
                    </p>
                  </div>
                </div>

                {/* 活跃动态 */}
                <p
                  className="mt-1.5 line-clamp-1 leading-snug"
                  style={{
                    fontSize: 10,
                    color: isDark ? 'hsl(var(--foreground) / 0.75)' : 'hsl(var(--foreground) / 0.75)',
                  }}
                >
                  {agent.statusText}
                </p>

                {/* 磁吸展开：专长技能标签 */}
                {(isHovered || isSelected) && (
                  <div className="mt-2 flex flex-wrap gap-1 pt-1 border-t border-current/10 animate-in fade-in duration-200">
                    {agent.specialties.map((spec) => (
                      <span
                        key={spec}
                        className="px-1.5 py-0.2 rounded"
                        style={{
                          fontSize: 9,
                          background: isDark ? 'hsl(var(--foreground) / 0.08)' : 'hsl(var(--foreground) / 0.06)',
                          color: isDark ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        #{spec}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              {/* 动态思维外溢气泡 */}
              {activeAgentBubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className="pointer-events-none absolute top-1 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-primary-foreground whitespace-nowrap shadow-xs backdrop-blur-md"
                  style={{
                    left: '100%',
                    fontSize: 10,
                    background:
                      'linear-gradient(135deg, hsl(var(--accent-purple) / 0.9) 0%, hsl(var(--accent-purple) / 0.9) 100%)',
                    animation: 'bubbleFloat 4.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                  }}
                >
                  <Sparkles className="size-3 animate-spin" style={{ color: 'hsl(var(--accent-yellow))', animationDuration: '3s' }} />
                  <span className="font-medium">{bubble.text}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes bubbleFloat {
          0% {
            opacity: 0;
            transform: translate3d(-10px, 4px, 0) scale(0.88);
          }
          15% {
            opacity: 1;
            transform: translate3d(10px, -2px, 0) scale(1);
          }
          85% {
            opacity: 0.95;
            transform: translate3d(30px, -12px, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(45px, -20px, 0) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
