import { useState } from 'react';
import type { TrustDimension, MemoryAtom } from '../types';
import { cn } from '@/lib/utils';
import { Sparkles, Database, Award, Info, ShieldCheck } from 'lucide-react';

interface TrustOrbitalLensProps {
  dimensions: TrustDimension[];
  memoryAtoms: MemoryAtom[];
  overallScore: number;
  isDark?: boolean;
}

// 右侧手表外弧角度 (从上到下)
const RIGHT_ARC_ANGLES = [-34, -11, 11, 34];

export function TrustOrbitalLens({
  dimensions,
  memoryAtoms,
  overallScore,
  isDark = true,
}: TrustOrbitalLensProps) {
  const [activeMemory, setActiveMemory] = useState<MemoryAtom | null>(null);

  return (
    <div className="relative select-none flex items-center justify-end" style={{ width: 340, height: 600 }}>
      {/* 1. 右侧手表表圈外缘导轨 SVG (Watch-Dial Right Bezel Track) */}
      <svg
        className="pointer-events-none absolute right-0 top-0 size-full overflow-visible opacity-50"
        viewBox="0 0 340 600"
      >
        {/* 外圆弧导轨 */}
        <path
          d="M 290 40 A 540 540 0 0 0 290 560"
          fill="none"
          stroke={isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(16, 185, 129, 0.25)'}
          strokeWidth="2"
          strokeDasharray="4 8"
        />
        {/* 内圆弧导轨 */}
        <path
          d="M 270 70 A 500 500 0 0 0 270 530"
          fill="none"
          stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)'}
          strokeWidth="1"
        />
        {/* 表盘刻度点 */}
        {[-38, -25, -12, 0, 12, 25, 38].map((angle, idx) => {
          const rad = (angle * Math.PI) / 180;
          const cx = 290 - 520 * (1 - Math.cos(rad)) * 0.4;
          const cy = 300 + 520 * Math.sin(rad) * 0.48;
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={angle === 0 ? 3 : 2}
              fill={isDark ? '#34D399' : '#10B981'}
              opacity={angle === 0 ? 0.9 : 0.4}
            />
          );
        })}
      </svg>

      {/* 顶部标签 */}
      <div
        className="absolute top-2 right-6 flex items-center gap-1.5 font-mono uppercase tracking-widest text-muted-foreground/70"
        style={{ fontSize: 10 }}
      >
        <Award className="size-3 text-accent-purple" />
        <span>GOVERNANCE DIAL / 信度表圈</span>
      </div>

      {/* 2. 呈半圆弧排布的 4 个手表复杂功能卡片 (Watch Complications) */}
      <div className="relative size-full flex flex-col justify-center items-end">
        {/* 模块 1：综合信度同心光轨仪 (角度 -34°) */}
        <div
          className="relative transition-transform duration-300 my-2"
          style={{
            transform: `translate3d(-${Math.cos((-34 * Math.PI) / 180) * 50 - 15}px, 0, 0) rotate(${
              -34 * 0.35
            }deg)`,
            transformOrigin: 'right center',
          }}
        >
          <div
            className="w-64 rounded-2xl p-3 backdrop-blur-2xl transition-all"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
              boxShadow: isDark
                ? '0 10px 28px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
                : '0 10px 24px -6px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative size-10 flex items-center justify-center shrink-0">
                  <svg className="absolute inset-0 size-full" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke={isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(99, 102, 241, 0.2)'}
                      strokeWidth="2"
                      strokeDasharray="2 3"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="12"
                      fill="none"
                      stroke="#34D399"
                      strokeWidth="2"
                      strokeDasharray="16 30"
                      className="animate-spin"
                      style={{ animationDuration: '8s' }}
                    />
                  </svg>
                  <span className="font-mono font-bold text-xs">{overallScore.toFixed(0)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold">项目信度总分</span>
                    <ShieldCheck className="size-3" style={{ color: '#34D399' }} />
                  </div>
                  <span
                    className="px-1.5 py-0.2 rounded font-mono"
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
              <span className="font-mono font-extrabold text-sm" style={{ color: '#10B981' }}>
                {overallScore}%
              </span>
            </div>
          </div>
        </div>

        {/* 模块 2：契约合规率与零漂移刻度 (角度 -11°) */}
        <div
          className="relative transition-transform duration-300 my-2"
          style={{
            transform: `translate3d(-${Math.cos((-11 * Math.PI) / 180) * 60 - 20}px, 0, 0) rotate(${
              -11 * 0.35
            }deg)`,
            transformOrigin: 'right center',
          }}
        >
          <div
            className="w-64 rounded-2xl p-3 backdrop-blur-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
              boxShadow: isDark
                ? '0 8px 24px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                : '0 10px 24px -6px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">契约合规率 (OpenAPI)</span>
              <span className="font-mono font-bold" style={{ color: '#10B981', fontSize: 11 }}>
                99.2%
              </span>
            </div>
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: '99.2%', background: 'linear-gradient(90deg, #10B981, #34D399)' }}
              />
            </div>
            <p
              className="mt-1 font-mono truncate"
              style={{
                fontSize: 9,
                color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.55)',
              }}
            >
              ZERO DRIFT · 单库隔离路由完全生效
            </p>
          </div>
        </div>

        {/* 模块 3：完备度与 Token ROI 刻度 (角度 +11°) */}
        <div
          className="relative transition-transform duration-300 my-2"
          style={{
            transform: `translate3d(-${Math.cos((11 * Math.PI) / 180) * 60 - 20}px, 0, 0) rotate(${
              11 * 0.35
            }deg)`,
            transformOrigin: 'right center',
          }}
        >
          <div
            className="w-64 rounded-2xl p-3 backdrop-blur-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.8) 100%)',
              boxShadow: isDark
                ? '0 8px 24px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                : '0 10px 24px -6px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
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
                  逻辑完备度
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 11 }}>
                  94.5%
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
                  Token ROI
                </span>
                <span className="font-mono font-bold" style={{ fontSize: 11, color: '#8B5CF6' }}>
                  92.8%
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-muted-foreground/80">
              <Sparkles className="size-3" style={{ color: '#FCD34D' }} />
              <span style={{ fontSize: 9 }}>无幻觉风险 · 代码契约高信度</span>
            </div>
          </div>
        </div>

        {/* 模块 4：工作区认知记忆星云 (角度 +34°) */}
        <div
          className="relative transition-transform duration-300 my-2"
          style={{
            transform: `translate3d(-${Math.cos((34 * Math.PI) / 180) * 50 - 15}px, 0, 0) rotate(${
              34 * 0.35
            }deg)`,
            transformOrigin: 'right center',
          }}
        >
          <div
            className="w-64 rounded-2xl p-2.5 backdrop-blur-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.75) 100%)',
              boxShadow: isDark
                ? '0 8px 24px -6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                : '0 10px 24px -6px rgba(30, 41, 59, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}
          >
            <div className="flex items-center justify-between gap-1 mb-1.5 px-0.5">
              <div className="flex items-center gap-1">
                <Database className="size-3 text-accent-purple" />
                <span className="font-semibold" style={{ fontSize: 10 }}>
                  工作区认知记忆
                </span>
              </div>
              <span
                className="font-mono"
                style={{
                  fontSize: 9,
                  color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.45)',
                }}
              >
                {memoryAtoms.length} ATOMS
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {memoryAtoms.map((atom) => (
                <button
                  key={atom.id}
                  type="button"
                  onClick={() => setActiveMemory(activeMemory?.id === atom.id ? null : atom)}
                  className="px-1.5 py-0.2 rounded font-mono transition-colors text-left cursor-pointer"
                  style={{
                    fontSize: 9,
                    background:
                      activeMemory?.id === atom.id
                        ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(99, 102, 241, 0.08)',
                    color:
                      activeMemory?.id === atom.id
                        ? '#FFFFFF'
                        : isDark
                        ? '#CBD5E1'
                        : '#4338CA',
                  }}
                >
                  #{atom.key}
                </button>
              ))}
            </div>

            {activeMemory && (
              <div
                className="mt-1.5 p-1.5 rounded-lg leading-relaxed border border-current/10 animate-in fade-in duration-150"
                style={{
                  fontSize: 9,
                  background: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <div className="flex items-center gap-1 text-accent-purple font-mono mb-0.5">
                  <Info className="size-2.5" />
                  <span>权重 {(activeMemory.weight * 100).toFixed(0)}%</span>
                </div>
                {activeMemory.summary}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
