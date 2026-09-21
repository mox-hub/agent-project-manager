import { useMemo } from 'react';

interface PrismCanvasProps {
  isDark: boolean;
}

export function PrismCanvas({ isDark }: PrismCanvasProps) {
  const bgGradientStart = isDark ? '#05070e' : '#fcfcfd';
  const bgGradientEnd = isDark ? '#0a0f1d' : '#f1f5f9';
  const gridStroke = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)';

  // 连续紧密连接的 5 大纯净彩虹光谱色带（无缝拼接，移除所有冗余文字）
  // 出射点沿棱镜右侧面切口 (X: ~245, Y: 180~250)，大幅扩散展开至右侧整个边界 (X: 490, Y: 70~380)
  const spectrumBands = useMemo(
    () => [
      { id: 'red', color: '#f43f5e', yStart0: 180, yStart1: 194, yEnd0: 70, yEnd1: 132 },
      { id: 'orange', color: '#f97316', yStart0: 194, yStart1: 208, yEnd0: 132, yEnd1: 194 },
      { id: 'green', color: '#10b981', yStart0: 208, yStart1: 222, yEnd0: 194, yEnd1: 256 },
      { id: 'blue', color: '#0ea5e9', yStart0: 222, yStart1: 236, yEnd0: 256, yEnd1: 318 },
      { id: 'purple', color: '#8b5cf6', yStart0: 236, yStart1: 250, yEnd0: 318, yEnd1: 380 },
    ],
    [],
  );

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* 极简深邃/高透背景 */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 45% 50%, ${bgGradientEnd} 0%, ${bgGradientStart} 100%)`,
        }}
      />

      {/* 纯净光影三棱镜与连续色散光谱 (主体大幅放大，移除所有冗余小字) */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 500 480"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* 入射聚焦白光束渐变 */}
          <linearGradient id="prismIncidentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity={isDark ? '0.75' : '0.5'} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={isDark ? '0.98' : '0.85'} />
          </linearGradient>

          {/* 玻璃高透折射渐变：前侧主切面 */}
          <linearGradient id="prismFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.24' : '0.45'} />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity={isDark ? '0.08' : '0.12'} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={isDark ? '0.04' : '0.06'} />
          </linearGradient>

          {/* 玻璃左侧入射受光面 */}
          <linearGradient id="prismLeftGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity={isDark ? '0.38' : '0.5'} />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity={isDark ? '0.2' : '0.22'} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={isDark ? '0.09' : '0.12'} />
          </linearGradient>

          {/* 玻璃右侧出射面 */}
          <linearGradient id="prismRightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.3' : '0.38'} />
            <stop offset="50%" stopColor="#a855f7" stopOpacity={isDark ? '0.16' : '0.2'} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={isDark ? '0.09' : '0.12'} />
          </linearGradient>

          {/* 内部穿透折射光柱渐变 */}
          <linearGradient id="prismInternalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isDark ? '0.9' : '0.8'} />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity={isDark ? '0.65' : '0.45'} />
          </linearGradient>

          {/* 柔和弥散滤镜 */}
          <filter id="prismBloom" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="prismEdgeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 连续色带专用横向柔和渐变 */}
          {spectrumBands.map((band) => (
            <linearGradient
              key={`band-grad-${band.id}`}
              id={`bandGrad-${band.id}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={band.color} stopOpacity={isDark ? '0.85' : '0.75'} />
              <stop offset="40%" stopColor={band.color} stopOpacity={isDark ? '0.6' : '0.5'} />
              <stop offset="100%" stopColor={band.color} stopOpacity={isDark ? '0.25' : '0.18'} />
            </linearGradient>
          ))}
        </defs>

        {/* 背景微透工程几何网格 */}
        <g stroke={gridStroke} strokeWidth="1">
          <circle cx="215" cy="225" r="160" fill="none" strokeDasharray="3,6" />
          <circle cx="215" cy="225" r="105" fill="none" strokeDasharray="2,4" />
          <line x1="40" y1="225" x2="480" y2="225" strokeDasharray="4,4" />
        </g>

        {/* 1. 宽幅连续色散彩虹光扇 (大幅展开至整幅右翼，无缝连绵，无冗余文字) */}
        <g filter="url(#prismBloom)">
          {/* 底层环境色彩连结晕 */}
          <polygon
            points="245,180 490,70 490,380 245,250"
            fill="url(#bandGrad-green)"
            opacity={isDark ? '0.18' : '0.1'}
          />

          {/* 5 块无缝嵌合的彩虹色带多边形实体 */}
          {spectrumBands.map((band) => (
            <polygon
              key={band.id}
              points={`245,${band.yStart0} 490,${band.yEnd0} 490,${band.yEnd1} 245,${band.yStart1}`}
              fill={`url(#bandGrad-${band.id})`}
            />
          ))}

          {/* 核心光谱流动流线 */}
          {spectrumBands.map((band) => (
            <line
              key={`line-${band.id}`}
              x1={245}
              y1={(band.yStart0 + band.yStart1) / 2}
              x2={490}
              y2={(band.yEnd0 + band.yEnd1) / 2}
              stroke={band.color}
              strokeWidth={isDark ? '2.2' : '1.8'}
              opacity={isDark ? '0.9' : '0.8'}
            />
          ))}
        </g>

        {/* 2. 入射白光光束 (强劲聚焦的白色高光柱) */}
        <g filter="url(#prismBloom)">
          {/* 发光外锥柱 */}
          <polygon
            points="10,140 172,192 170,222 10,180"
            fill="url(#prismIncidentGrad)"
          />

          {/* 核心纯白光线 */}
          <line
            x1="10"
            y1="160"
            x2="171"
            y2="207"
            stroke="#ffffff"
            strokeWidth={isDark ? '3.5' : '3'}
            strokeLinecap="round"
            filter="url(#prismEdgeGlow)"
            opacity={isDark ? '0.98' : '0.9'}
          />

          {/* 入射界面光斑热点 (Hotspot) */}
          <circle
            cx="171"
            cy="207"
            r="8"
            fill="#ffffff"
            filter="url(#prismBloom)"
            opacity={isDark ? '0.95' : '0.85'}
          />
          <circle cx="171" cy="207" r="4" fill="#ffffff" />
        </g>

        {/* 3. 大幅放大的 3D 光学三棱柱 (透视饱满，晶莹剔透) */}
        <g
          className="transition-transform duration-700 hover:scale-105"
          style={{ transformOrigin: '215px 225px' }}
        >
          {/* 背侧暗部投影 */}
          <polygon
            points="145,325 260,335 315,285 200,275"
            fill={isDark ? '#000000' : '#cbd5e1'}
            opacity={isDark ? '0.55' : '0.3'}
          />

          {/* 棱镜背部隐藏棱线 (透视可见) */}
          <line
            x1="200"
            y1="275"
            x2="255"
            y2="75"
            stroke={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)'}
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />

          {/* 内部穿透折射光柱 (左入射界面 -> 右出射切口，透光可见) */}
          <g filter="url(#prismBloom)">
            <polygon
              points="171,198 245,180 245,250 171,216"
              fill="url(#prismInternalGrad)"
              opacity={isDark ? '0.75' : '0.55'}
            />
          </g>

          {/* 左侧入射面 (A1(200,105) -> A2(255,75) -> B2(200,275) -> B1(145,325)) */}
          <polygon
            points="200,105 255,75 200,275 145,325"
            fill="url(#prismLeftGrad)"
            stroke={isDark ? 'rgba(255,255,255,0.32)' : 'rgba(15,23,42,0.22)'}
            strokeWidth="1.2"
          />

          {/* 右侧出射面 (A1(200,105) -> A2(255,75) -> C2(315,285) -> C1(260,335)) */}
          <polygon
            points="200,105 255,75 315,285 260,335"
            fill="url(#prismRightGrad)"
            stroke={isDark ? 'rgba(255,255,255,0.36)' : 'rgba(15,23,42,0.22)'}
            strokeWidth="1.2"
          />

          {/* 前侧高透主切面 (A1(200,105) -> B1(145,325) -> C1(260,335)) */}
          <polygon
            points="200,105 145,325 260,335"
            fill="url(#prismFrontGrad)"
            stroke={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.32)'}
            strokeWidth="1.4"
          />

          {/* 棱镜右侧发射切口微光高亮带 */}
          <line
            x1="245"
            y1="180"
            x2="245"
            y2="250"
            stroke="#ffffff"
            strokeWidth="3.5"
            filter="url(#prismBloom)"
            opacity={isDark ? '0.98' : '0.85'}
          />

          {/* 锐利玻璃高光棱线 (增强纯澈透明度) */}
          {/* 1. 主前脊棱线 */}
          <line
            x1="200"
            y1="105"
            x2="145"
            y2="325"
            stroke="#ffffff"
            strokeWidth={isDark ? '2' : '1.6'}
            opacity={isDark ? '0.9' : '0.75'}
          />
          {/* 2. 顶脊向后延伸棱线 */}
          <line
            x1="200"
            y1="105"
            x2="255"
            y2="75"
            stroke="#ffffff"
            strokeWidth={isDark ? '2.2' : '1.8'}
            filter="url(#prismEdgeGlow)"
            opacity={isDark ? '0.98' : '0.9'}
          />
          {/* 3. 前底边棱线 */}
          <line
            x1="145"
            y1="325"
            x2="260"
            y2="335"
            stroke={isDark ? '#e0f2fe' : '#94a3b8'}
            strokeWidth="1.4"
            opacity="0.8"
          />
          {/* 4. 右前斜棱线 */}
          <line
            x1="200"
            y1="105"
            x2="260"
            y2="335"
            stroke={isDark ? '#bae6fd' : '#cbd5e1'}
            strokeWidth="1.4"
            opacity="0.75"
          />

          {/* 顶端聚焦点光斑 */}
          <circle cx="200" cy="105" r="3.5" fill="#ffffff" filter="url(#prismEdgeGlow)" />
        </g>
      </svg>
    </div>
  );
}
