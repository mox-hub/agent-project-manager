import { useEffect, useState } from 'react';

interface LivingNebulaBackgroundProps {
  isDark: boolean;
}

/**
 * 有机呼吸星云背景（适配日间与夜间双模态）
 * 动态根据主题调整光斑饱和度与色相，赋予界面宏大的空间深度感与生命呼吸感。
 */
export function LivingNebulaBackground({ isDark }: LivingNebulaBackgroundProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 鼠标微视差跟踪
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 16;
      const y = (e.clientY / innerHeight - 0.5) * 16;
      setOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden select-none -z-10 transition-colors duration-500"
      style={{
        backgroundColor: isDark ? '#07080c' : '#F5F7FC',
        backgroundImage: isDark
          ? 'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.45) 0%, #07080c 100%)'
          : 'radial-gradient(circle at 50% 40%, rgba(224, 231, 255, 0.6) 0%, #EDF2FA 100%)',
      }}
    >
      {/* 极光星云 1：紫罗兰微光，左侧弧形区衬底 */}
      <div
        className="absolute rounded-full transition-transform duration-1000 ease-out"
        style={{
          width: 580,
          height: 580,
          top: '-5%',
          left: '5%',
          background: isDark
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.20) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 80%)',
          filter: 'blur(90px)',
          transform: `translate3d(${offset.x * -0.8}px, ${offset.y * -0.8}px, 0)`,
          animation: 'nebulaPulse 8s ease-in-out infinite alternate',
        }}
      />

      {/* 极光星云 2：天青/翡翠微光，右侧表圈衬底 */}
      <div
        className="absolute rounded-full transition-transform duration-1000 ease-out"
        style={{
          width: 540,
          height: 540,
          top: '15%',
          right: '2%',
          background: isDark
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.07) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(16, 185, 129, 0.06) 50%, transparent 80%)',
          filter: 'blur(80px)',
          transform: `translate3d(${offset.x * 0.6}px, ${offset.y * 0.6}px, 0)`,
          animation: 'nebulaPulse 11s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* 极光星云 3：中央项目核心光晕 */}
      <div
        className="absolute rounded-full transition-transform duration-1000 ease-out"
        style={{
          width: 700,
          height: 380,
          bottom: '-8%',
          left: '25%',
          background: isDark
            ? 'radial-gradient(ellipse, rgba(245, 158, 11, 0.09) 0%, rgba(139, 92, 246, 0.07) 50%, transparent 80%)'
            : 'radial-gradient(ellipse, rgba(245, 158, 11, 0.08) 0%, rgba(99, 102, 241, 0.05) 50%, transparent 80%)',
          filter: 'blur(90px)',
          transform: `translate3d(${offset.x * 0.4}px, ${offset.y * 0.4}px, 0)`,
          animation: 'nebulaPulse 9s ease-in-out infinite alternate',
        }}
      />

      {/* 全息精细点阵网格 */}
      <div
        className="absolute inset-0"
        style={{
          opacity: isDark ? 0.03 : 0.04,
          backgroundImage: isDark
            ? 'radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)'
            : 'radial-gradient(rgba(15, 23, 42, 0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <style>{`
        @keyframes nebulaPulse {
          0% {
            opacity: 0.65;
            transform: scale(0.96);
          }
          100% {
            opacity: 0.95;
            transform: scale(1.06);
          }
        }
      `}</style>
    </div>
  );
}
