import { useState, useEffect } from 'react';
import type { AgentPersona, ActivityBubble } from '../types';
import { cn } from '@/lib/utils';
import { Brain, Cpu, Shield, Sparkles, ChevronRight, Activity } from 'lucide-react';

interface SquadCapsuleOrbitProps {
  agents: AgentPersona[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export function SquadCapsuleOrbit({
  agents,
  selectedAgentId,
  onSelectAgent,
}: SquadCapsuleOrbitProps) {
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<ActivityBubble[]>([]);

  // 模拟生命感：每隔一段时间随机让一个 Agent "吐出"一个思维气泡
  useEffect(() => {
    const emitterPhrases = [
      { agentId: 'agent-pm', text: '对齐 CAP-P-01 业务边界' },
      { agentId: 'agent-architect', text: 'OpenAPI 零漂移校验通过' },
      { agentId: 'agent-coder', text: '组件重绘优化完成: 120fps' },
      { agentId: 'agent-qa', text: '执行测试套件: 100% 通过' },
      { agentId: 'agent-coder', text: '提交分支: feat/ai-surface' },
      { agentId: 'agent-pm', text: '拆解出 3 个原子 Issue' },
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

      setBubbles((prev) => [...prev.slice(-4), newBubble]);

      // 4 秒后淡出移除
      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
      }, 4000);
    }, 4500);

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

  const getStatusGlow = (status: AgentPersona['status']) => {
    switch (status) {
      case 'reasoning':
        return 'rgba(168, 85, 247, 0.4)'; // 紫色流光
      case 'executing':
        return 'rgba(16, 185, 129, 0.45)'; // 翠绿流光
      case 'auditing':
        return 'rgba(245, 158, 11, 0.4)'; // 琥珀微光
      case 'idle':
        return 'rgba(148, 163, 184, 0.2)'; // 静息蓝灰
    }
  };

  return (
    <div className="relative flex flex-col gap-3.5 select-none w-72">
      {/* 标题提示：极简科技小字 */}
      <div className="flex items-center gap-2 px-2 pb-1 text-xs text-muted-foreground/60 uppercase tracking-widest font-mono">
        <Activity className="size-3 text-accent-purple" />
        <span>SQUAD ORBIT / 数字生命编队</span>
      </div>

      {/* 悬浮胶囊星链 */}
      <div className="flex flex-col gap-3">
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const isHovered = hoveredAgentId === agent.id;
          const RoleIcon = getRoleIcon(agent.role);
          const glowColor = getStatusGlow(agent.status);

          // 属于该 Agent 的当前悬浮气泡
          const activeAgentBubbles = bubbles.filter((b) => b.agentId === agent.id);

          return (
            <div key={agent.id} className="relative group">
              {/* 胶囊主体 */}
              <button
                type="button"
                onClick={() => onSelectAgent(agent.id)}
                onMouseEnter={() => setHoveredAgentId(agent.id)}
                onMouseLeave={() => setHoveredAgentId(null)}
                className={cn(
                  'relative w-full text-left rounded-2xl p-3.5 transition-all duration-300 ease-out',
                  'backdrop-blur-xl',
                  isSelected ? 'shadow-lg' : '',
                )}
                style={{
                  transform: isSelected ? 'scale(1.02)' : isHovered ? 'scale(1.01)' : 'none',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  boxShadow: isSelected
                    ? `0 12px 32px -4px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                    : '0 8px 24px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* 顶部行：头像、状态、信度评分 */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* 呼吸光环头像 */}
                    <div
                      className="relative flex items-center justify-center size-9 rounded-xl text-sm font-semibold shrink-0 text-white"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
                        boxShadow: `0 0 16px ${glowColor}`,
                      }}
                    >
                      <RoleIcon className="size-4 text-white" />
                      {/* 呼吸状态灯 */}
                      <span
                        className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            agent.status === 'executing'
                              ? '#10B981'
                              : agent.status === 'reasoning'
                              ? '#A855F7'
                              : agent.status === 'auditing'
                              ? '#F59E0B'
                              : '#64748B',
                          boxShadow: `0 0 8px ${glowColor}`,
                        }}
                      />
                    </div>

                    {/* 名字与定位 */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground truncate">
                          {agent.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full font-mono text-muted-foreground/80"
                          style={{ fontSize: 10, background: 'rgba(255,255,255,0.08)' }}
                        >
                          {agent.role.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate mt-0.5" style={{ fontSize: 11 }}>
                        {agent.roleTitle}
                      </p>
                    </div>
                  </div>

                  {/* 信度小徽章 */}
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-semibold" style={{ color: '#34D399' }}>
                      {agent.trustScore}%
                    </span>
                    <p className="text-muted-foreground/70 font-mono" style={{ fontSize: 10 }}>
                      信度
                    </p>
                  </div>
                </div>

                {/* 实时状态/思考摘要 */}
                <div className="mt-2.5 pt-2 border-t border-white/5">
                  <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                    {agent.statusText}
                  </p>
                </div>

                {/* 当前活跃 Issue 胶囊 */}
                {agent.activeIssue && (
                  <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
                    style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.04)' }}
                  >
                    <span className="font-mono text-accent-purple font-semibold">
                      {agent.activeIssue.key}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {agent.activeIssue.title}
                    </span>
                    <ChevronRight className="size-3 ml-auto text-muted-foreground/50 shrink-0" />
                  </div>
                )}

                {/* 磁吸展开：专长技能标签（悬浮或选中时流畅渐显） */}
                {(isHovered || isSelected) && (
                  <div className="mt-2.5 flex flex-wrap gap-1 pt-1 animate-in fade-in duration-200">
                    {agent.specialties.map((spec) => (
                      <span
                        key={spec}
                        className="px-1.5 py-0.5 rounded-md text-foreground/70"
                        style={{ fontSize: 10, background: 'rgba(255, 255, 255, 0.08)' }}
                      >
                        #{spec}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              {/* 动态思维外溢气泡（右侧缓缓漂浮） */}
              {activeAgentBubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className="pointer-events-none absolute top-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white whitespace-nowrap shadow-xl backdrop-blur-md"
                  style={{
                    left: '102%',
                    fontSize: 11,
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.85) 0%, rgba(139, 92, 246, 0.85) 100%)',
                    animation: 'bubbleFloat 4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
                  }}
                >
                  <Sparkles className="size-3 animate-spin" style={{ color: '#FCD34D', animationDuration: '3s' }} />
                  <span className="font-medium" style={{ fontSize: 11 }}>{bubble.text}</span>
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
            transform: translate3d(-8px, 4px, 0) scale(0.9);
          }
          15% {
            opacity: 1;
            transform: translate3d(8px, 0px, 0) scale(1);
          }
          85% {
            opacity: 0.95;
            transform: translate3d(24px, -10px, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate3d(36px, -18px, 0) scale(0.92);
          }
        }
      `}</style>
    </div>
  );
}
