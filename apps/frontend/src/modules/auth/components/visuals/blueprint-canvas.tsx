import { useMemo } from 'react';

interface BlueprintCanvasProps {
  isDark: boolean;
}

export function BlueprintCanvas({ isDark }: BlueprintCanvasProps) {
  // 生成底盘等距网格参考线
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = -7; i <= 7; i++) {
      lines.push(i * 32);
    }
    return lines;
  }, []);

  const strokePrimary = isDark ? '#38bdf8' : '#1d4ed8';
  const strokeSecondary = isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(29, 78, 216, 0.16)';
  const strokeAccent = isDark ? '#34d399' : '#059669';
  const bgGradientStart = isDark ? '#080d1a' : '#f8fafc';
  const bgGradientEnd = isDark ? '#0f172a' : '#eef2ff';

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* 背景氛围渐变 */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${bgGradientEnd} 0%, ${bgGradientStart} 100%)`,
        }}
      />

      {/* 纯净 3D 建筑蓝图矢量图层 (主体放大，移除所有冗余文字) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 500 480"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* 垂直扫描线柔光渐变 */}
          <linearGradient id="blueprintScanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={strokePrimary} stopOpacity="0" />
            <stop offset="50%" stopColor={strokePrimary} stopOpacity={isDark ? '0.7' : '0.45'} />
            <stop offset="100%" stopColor={strokePrimary} stopOpacity="0" />
          </linearGradient>

          {/* 建筑立面半透明填充 */}
          <linearGradient id="faceGradBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokePrimary} stopOpacity={isDark ? '0.28' : '0.14'} />
            <stop offset="100%" stopColor={strokePrimary} stopOpacity={isDark ? '0.05' : '0.02'} />
          </linearGradient>

          <linearGradient id="faceGradMid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeAccent} stopOpacity={isDark ? '0.3' : '0.16'} />
            <stop offset="100%" stopColor={strokePrimary} stopOpacity={isDark ? '0.06' : '0.03'} />
          </linearGradient>

          {/* 节点光晕滤镜 */}
          <filter id="bpNodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. 扩大等距底盘网格 Isometric Grid Base (稳固地基) */}
        <g transform="translate(250, 395)">
          {gridLines.map((offset, i) => (
            <line
              key={`grid-x-${i}`}
              x1={offset}
              y1={offset * 0.5 - 75}
              x2={offset - 220}
              y2={offset * 0.5 + 45}
              stroke={strokeSecondary}
              strokeWidth="1"
              strokeDasharray="2,4"
            />
          ))}
          {gridLines.map((offset, i) => (
            <line
              key={`grid-y-${i}`}
              x1={offset}
              y1={-offset * 0.5 - 75}
              x2={offset + 220}
              y2={-offset * 0.5 + 45}
              stroke={strokeSecondary}
              strokeWidth="1"
              strokeDasharray="2,4"
            />
          ))}

          {/* 基座多级外框 */}
          <polygon
            points="0,-75 200,25 0,125 -200,25"
            fill="none"
            stroke={strokePrimary}
            strokeWidth="1.5"
            strokeDasharray="4,3"
            opacity={isDark ? '0.6' : '0.4'}
          />
        </g>

        {/* 2. 宏伟 3D 建筑大厦主体 (整体放大 1.4 倍，布局更平衡饱满) */}
        <g transform="translate(250, 255) scale(1.35)">
          {/* Level 1: 基础设施台阶底座 Foundation Platform */}
          <g>
            <polygon
              points="-105,75 0,125 105,75 0,25"
              fill="url(#faceGradBase)"
              stroke={strokePrimary}
              strokeWidth="1.4"
            />
            <polygon
              points="-105,75 0,125 0,150 -105,100"
              fill="url(#faceGradBase)"
              stroke={strokePrimary}
              strokeWidth="1.4"
            />
            <polygon
              points="0,125 105,75 105,100 0,150"
              fill="url(#faceGradBase)"
              stroke={strokePrimary}
              strokeWidth="1.4"
            />
          </g>

          {/* Level 2: 任务与契约承重柱网及中层平台 Core Framework */}
          <g>
            {/* 4 根主结构承重柱 */}
            <line x1="-80" y1="55" x2="-80" y2="-15" stroke={strokePrimary} strokeWidth="1.5" />
            <line x1="0" y1="95" x2="0" y2="25" stroke={strokePrimary} strokeWidth="1.5" />
            <line x1="80" y1="55" x2="80" y2="-15" stroke={strokePrimary} strokeWidth="1.5" />
            <line x1="0" y1="15" x2="0" y2="-55" stroke={strokePrimary} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />

            {/* 中层结构楼板 */}
            <polygon
              points="-80,-15 0,25 80,-15 0,-55"
              fill="url(#faceGradMid)"
              stroke={strokePrimary}
              strokeWidth="1.5"
            />

            {/* 楼层内部数据拓扑交织线 */}
            <line x1="-80" y1="-15" x2="80" y2="-15" stroke={strokeSecondary} strokeWidth="1" strokeDasharray="2,2" />
            <line x1="0" y1="25" x2="0" y2="-55" stroke={strokeSecondary} strokeWidth="1" strokeDasharray="2,2" />
          </g>

          {/* Level 3: 悬浮指挥枢纽与执行塔楼 Command Deck */}
          <g>
            <polygon
              points="-55,-65 0,-35 55,-65 0,-95"
              fill="url(#faceGradBase)"
              stroke={strokePrimary}
              strokeWidth="1.5"
            />
            <polygon
              points="-55,-65 0,-35 0,-15 -55,-45"
              fill="url(#faceGradBase)"
              stroke={strokePrimary}
              strokeWidth="1.4"
            />
            <polygon
              points="0,-35 55,-65 55,-45 0,-15"
              fill="url(#faceGradBase)"
              stroke={strokePrimary}
              strokeWidth="1.4"
            />

            {/* 核心治理节点发光指示点 */}
            <circle cx="0" cy="-35" r="3.5" fill={strokeAccent} filter="url(#bpNodeGlow)" />
            <circle cx="-55" cy="-65" r="3" fill={strokePrimary} />
            <circle cx="55" cy="-65" r="3" fill={strokePrimary} />
          </g>

          {/* Level 4: 顶层天线与全息验收感知环 Acceptance Ring */}
          <g>
            <line x1="0" y1="-95" x2="0" y2="-140" stroke={strokeAccent} strokeWidth="2" />

            {/* 旋转感知光环 */}
            <ellipse
              cx="0"
              cy="-145"
              rx="40"
              ry="18"
              fill="none"
              stroke={strokeAccent}
              strokeWidth="1.6"
              strokeDasharray="9,4"
              filter="url(#bpNodeGlow)"
              className="animate-spin"
              style={{ transformOrigin: '0px -145px', animationDuration: '20s' }}
            />

            <circle cx="0" cy="-145" r="4" fill={strokeAccent} filter="url(#bpNodeGlow)" />
          </g>

          {/* 3. 动态激光扫描平面 (缓动微光) */}
          <g className="animate-pulse">
            <polygon
              points="-130,50 0,110 130,50 0,-10"
              fill="url(#blueprintScanGrad)"
              opacity={isDark ? '0.4' : '0.25'}
              className="transition-all"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
