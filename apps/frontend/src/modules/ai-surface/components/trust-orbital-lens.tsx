import { useState } from 'react';
import type { MemoryAtom } from '../types';
import { Sparkles, Database, Award, Info, ShieldCheck } from 'lucide-react';

/**
 * ⚠️ 本组件当前**全仓零引用**（S2-e 复核：`grep -rn TrustOrbitalLens src` 只命中自身）。
 * 保留而不删是等产品裁决（是否后续接线），故此处只做**不改变行为**的最小维护：
 * 随 `TrustDimension` 类型一并摘除已无人供数的 `dimensions` 入参。
 */
interface TrustOrbitalLensProps {
  memoryAtoms: MemoryAtom[];
  overallScore: number;
  isDark?: boolean;
}

export function TrustOrbitalLens({
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
          stroke={isDark ? 'hsl(var(--accent-green) / 0.25)' : 'hsl(var(--accent-green) / 0.25)'}
          strokeWidth="2"
          strokeDasharray="4 8"
        />
        {/* 内圆弧导轨 */}
        <path
          d="M 270 70 A 500 500 0 0 0 270 530"
          fill="none"
          stroke={isDark ? 'hsl(var(--foreground) / 0.1)' : 'hsl(var(--foreground) / 0.1)'}
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
              fill={isDark ? 'hsl(var(--accent-green))' : 'hsl(var(--accent-green))'}
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
            className="w-64 rounded-2xl p-3 shadow-xs backdrop-blur-2xl transition-all"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.08) 0%, hsl(var(--foreground) / 0.02) 100%)'
                : 'linear-gradient(135deg, hsl(var(--card) / 0.88) 0%, hsl(var(--card) / 0.8) 100%)',
              color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
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
                      stroke={
                        isDark
                          ? 'hsl(var(--accent-purple) / 0.3)'
                          : 'hsl(var(--accent-purple) / 0.2)'
                      }
                      strokeWidth="2"
                      strokeDasharray="2 3"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="12"
                      fill="none"
                      stroke="hsl(var(--accent-green))"
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
                    <ShieldCheck className="size-3" style={{ color: 'hsl(var(--accent-green))' }} />
                  </div>
                  <span
                    className="px-1.5 py-0.2 rounded font-mono"
                    style={{
                      fontSize: 9,
                      background: 'hsl(var(--accent-green) / 0.15)',
                      color: 'hsl(var(--accent-green))',
                    }}
                  >
                    LEVEL 3 准自主
                  </span>
                </div>
              </div>
              <span
                className="font-mono font-extrabold text-sm"
                style={{ color: 'hsl(var(--accent-green))' }}
              >
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
            className="w-64 rounded-2xl p-3 shadow-xs backdrop-blur-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.07) 0%, hsl(var(--foreground) / 0.02) 100%)'
                : 'linear-gradient(135deg, hsl(var(--card) / 0.88) 0%, hsl(var(--card) / 0.8) 100%)',
              color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
            }}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">契约合规率 (OpenAPI)</span>
              <span
                className="font-mono font-bold"
                style={{ color: 'hsl(var(--accent-green))', fontSize: 11 }}
              >
                99.2%
              </span>
            </div>
            <div
              className="h-1.5 w-full rounded-full overflow-hidden"
              style={{
                background: isDark
                  ? 'hsl(var(--foreground) / 0.08)'
                  : 'hsl(var(--foreground) / 0.08)',
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: '99.2%',
                  background:
                    'linear-gradient(90deg, hsl(var(--accent-green)), hsl(var(--accent-green)))',
                }}
              />
            </div>
            <p
              className="mt-1 font-mono truncate"
              style={{
                fontSize: 9,
                color: isDark
                  ? 'hsl(var(--foreground) / 0.5)'
                  : 'hsl(var(--foreground) / 0.55)',
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
            className="w-64 rounded-2xl p-3 shadow-xs backdrop-blur-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.07) 0%, hsl(var(--foreground) / 0.02) 100%)'
                : 'linear-gradient(135deg, hsl(var(--card) / 0.88) 0%, hsl(var(--card) / 0.8) 100%)',
              color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
            }}
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span
                  className="block font-mono"
                  style={{
                    fontSize: 9,
                    color: isDark
                      ? 'hsl(var(--foreground) / 0.55)'
                      : 'hsl(var(--foreground) / 0.55)',
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
                    color: isDark
                      ? 'hsl(var(--foreground) / 0.55)'
                      : 'hsl(var(--foreground) / 0.55)',
                  }}
                >
                  Token ROI
                </span>
                <span
                  className="font-mono font-bold"
                  style={{ fontSize: 11, color: 'hsl(var(--accent-purple))' }}
                >
                  92.8%
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-muted-foreground/80">
              <Sparkles className="size-3" style={{ color: 'hsl(var(--accent-yellow))' }} />
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
            className="w-64 rounded-2xl p-2.5 shadow-xs backdrop-blur-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, hsl(var(--foreground) / 0.06) 0%, hsl(var(--foreground) / 0.015) 100%)'
                : 'linear-gradient(135deg, hsl(var(--card) / 0.85) 0%, hsl(var(--card) / 0.75) 100%)',
              color: isDark ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))',
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
                  color: isDark
                    ? 'hsl(var(--foreground) / 0.4)'
                    : 'hsl(var(--foreground) / 0.45)',
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
                    // 原为「紫→靛」双色渐变。靛蓝不在设计系统五色域内，按设计纪要
                    // §4.4-5 两端同归 --accent-purple；两端同值即退化，故直接落纯色
                    // （DESIGN.md 要求 AI 标识无渐变）。原色值字面量见 CHANGELOG，
                    // 本文件不保留 hex——门禁连注释一并扫描。
                    background:
                      activeMemory?.id === atom.id
                        ? 'hsl(var(--accent-purple))'
                        : isDark
                        ? 'hsl(var(--foreground) / 0.08)'
                        : 'hsl(var(--accent-purple) / 0.08)',
                    color:
                      activeMemory?.id === atom.id
                        ? 'hsl(var(--primary-foreground))'
                        : isDark
                        ? 'hsl(var(--muted-foreground))'
                        : 'hsl(var(--accent-purple))',
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
                  background: isDark
                    ? 'hsl(var(--background) / 0.5)'
                    : 'hsl(var(--card) / 0.9)',
                }}
              >
                <div className="flex items-center gap-1 text-accent-purple font-mono mb-0.5">
                  <Info className="size-2.5" />
                  {/* 原此处读 `activeMemory.weight` 渲染「权重 98%」——编造的精度，
                      随 S2-e 一并摘除（见 `mock-data.ts` MEMORY_ATOMS 注释） */}
                  <span>{activeMemory.category}</span>
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
