import { useState } from 'react';
import type { TrustDimension, MemoryAtom } from '../types';
import { cn } from '@/lib/utils';
import { Sparkles, Database, Award, Info } from 'lucide-react';

interface TrustOrbitalLensProps {
  dimensions: TrustDimension[];
  memoryAtoms: MemoryAtom[];
  overallScore: number;
}

export function TrustOrbitalLens({
  dimensions,
  memoryAtoms,
  overallScore,
}: TrustOrbitalLensProps) {
  const [activeMemory, setActiveMemory] = useState<MemoryAtom | null>(null);

  return (
    <div className="relative flex flex-col gap-4 select-none w-80">
      {/* 标题提示 */}
      <div className="flex items-center gap-2 px-2 pb-1 text-xs text-muted-foreground/60 uppercase tracking-widest font-mono">
        <Award className="size-3 text-accent-purple" />
        <span>TRUST ORBIT / 信度与反思透镜</span>
      </div>

      {/* 1. 同心旋转信度陀螺仪 (Orbital Gyroscope) 与综合评分 */}
      <div
        className="relative rounded-2xl p-4 overflow-hidden backdrop-blur-xl flex flex-col items-center justify-center text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)',
          boxShadow: '0 12px 32px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* SVG 同心旋转发光光轨 */}
        <div className="relative size-36 flex items-center justify-center my-1">
          <svg className="absolute inset-0 size-full" viewBox="0 0 144 144">
            {/* 外轨道 1 */}
            <circle
              cx="72"
              cy="72"
              r="64"
              fill="none"
              stroke="rgba(139, 92, 246, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="animate-spin"
              style={{ animationDuration: '30s' }}
            />
            {/* 中轨道 2（反转） */}
            <circle
              cx="72"
              cy="72"
              r="50"
              fill="none"
              stroke="rgba(52, 211, 153, 0.3)"
              strokeWidth="2"
              strokeDasharray="18 24"
              className="animate-spin"
              style={{ animationDuration: '20s', animationDirection: 'reverse' }}
            />
            {/* 质点 1 */}
            <circle cx="72" cy="8" r="3" fill="#A855F7" />
            {/* 质点 2 */}
            <circle cx="122" cy="72" r="3" fill="#34D399" />
          </svg>

          {/* 中心评分大字 */}
          <div className="flex flex-col items-center justify-center z-10">
            <span
              className="text-3xl font-extrabold font-mono tracking-tight"
              style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #A78BFA 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {overallScore.toFixed(1)}
            </span>
            <span className="uppercase font-mono tracking-wider text-muted-foreground/80 mt-0.5" style={{ fontSize: 10 }}>
              信度总分
            </span>
            <span
              className="px-1.5 py-0.2 rounded-full font-mono mt-1"
              style={{ fontSize: 9, background: 'rgba(52, 211, 153, 0.15)', color: '#34D399' }}
            >
              LEVEL 3 准自主
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/80 mt-1" style={{ maxWidth: 220 }}>
          基于 OpenAPI 零漂移规范、边界完备性与真实执行证据综合加权评估
        </p>
      </div>

      {/* 2. 多维评分细分悬浮卡片 (Dimensional Metrics) */}
      <div
        className="rounded-2xl p-4 backdrop-blur-xl flex flex-col gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
          boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center justify-between text-xs font-medium text-foreground">
          <span>维度评估指标</span>
          <span className="font-mono text-muted-foreground" style={{ fontSize: 10 }}>REAL-TIME</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {dimensions.map((dim) => {
            const pct = (dim.score / dim.maxScore) * 100;
            return (
              <div key={dim.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground" style={{ fontSize: 11 }}>{dim.label}</span>
                  <span className="font-mono font-semibold text-foreground" style={{ fontSize: 11 }}>
                    {dim.score}%
                  </span>
                </div>
                {/* 极细微光能量条 */}
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background:
                        dim.status === 'optimal'
                          ? 'linear-gradient(90deg, #10B981, #34D399)'
                          : 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. AI 反思与自我审计切片 (Reflection Shard) */}
      <div
        className="rounded-2xl p-3.5 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
          boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="size-3.5" style={{ color: '#FCD34D' }} />
          <span className="text-xs font-semibold text-foreground">AI 自我反思与复盘</span>
        </div>
        <p className="text-muted-foreground/90 leading-relaxed" style={{ fontSize: 11 }}>
          “本次任务已严格校验组件层级与代码契约，未引入任何破坏性重写。当前放行率处于高信度区间，建议继续保持多工作区隔离规范。”
        </p>
      </div>

      {/* 4. 活跃记忆星群词云 (Memory Nebula Cluster) */}
      <div
        className="rounded-2xl p-3.5 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
          boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1.5">
            <Database className="size-3 text-accent-purple" />
            <span className="text-xs font-semibold text-foreground">工作区认知记忆</span>
          </div>
          <span className="font-mono text-muted-foreground/60" style={{ fontSize: 10 }}>
            {memoryAtoms.length} ATOMS
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {memoryAtoms.map((atom) => (
            <button
              key={atom.id}
              type="button"
              onClick={() => setActiveMemory(activeMemory?.id === atom.id ? null : atom)}
              className={cn(
                'px-2 py-0.5 rounded-full font-mono transition-all duration-200 text-left',
                activeMemory?.id === atom.id
                  ? 'text-white'
                  : 'text-foreground/70 hover:text-foreground',
              )}
              style={{
                fontSize: 10,
                background:
                  activeMemory?.id === atom.id
                    ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                    : 'rgba(255, 255, 255, 0.06)',
              }}
            >
              #{atom.key}
            </button>
          ))}
        </div>

        {activeMemory && (
          <div
            className="mt-2.5 p-2 rounded-xl leading-relaxed text-foreground/90 border border-white/5 animate-in fade-in duration-150"
            style={{ fontSize: 11, background: 'rgba(0, 0, 0, 0.4)' }}
          >
            <div className="flex items-center gap-1 text-accent-purple font-mono mb-0.5" style={{ fontSize: 10 }}>
              <Info className="size-3" />
              <span>权重 {(activeMemory.weight * 100).toFixed(0)}%</span>
            </div>
            {activeMemory.summary}
          </div>
        )}
      </div>
    </div>
  );
}
