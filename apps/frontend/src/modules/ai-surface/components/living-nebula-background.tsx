import { useEffect, useState } from 'react';

/**
 * 有机呼吸星云背景
 * 纯深空炭黑，底层悬浮两到三团慢速流动的极光光晕，赋予界面生命感与呼吸感。
 */
export function LivingNebulaBackground() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 鼠标微视差跟踪（微弱的失重阻尼感）
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
      className="pointer-events-none fixed inset-0 overflow-hidden select-none -z-10"
      style={{
        backgroundColor: '#07080c',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.4) 0%, #07080c 100%)',
      }}
    >
      {/* 极光星云 1：青蓝紫流体微光，左上角 */}
      <div
        className="absolute rounded-full transition-transform duration-1000 ease-out"
        style={{
          width: 520,
          height: 520,
          top: '-10%',
          left: '10%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 80%)',
          filter: 'blur(90px)',
          transform: `translate3d(${offset.x * -0.8}px, ${offset.y * -0.8}px, 0)`,
          animation: 'nebulaPulse 8s ease-in-out infinite alternate',
        }}
      />

      {/* 极光星云 2：翡翠微光，右侧信度区衬底 */}
      <div
        className="absolute rounded-full transition-transform duration-1000 ease-out"
        style={{
          width: 480,
          height: 480,
          top: '20%',
          right: '5%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.06) 50%, transparent 80%)',
          filter: 'blur(80px)',
          transform: `translate3d(${offset.x * 0.6}px, ${offset.y * 0.6}px, 0)`,
          animation: 'nebulaPulse 11s ease-in-out infinite alternate-reverse',
        }}
      />

      {/* 极光星云 3：琥珀暗金流光，底部 Dock 衬底 */}
      <div
        className="absolute rounded-full transition-transform duration-1000 ease-out"
        style={{
          width: 600,
          height: 320,
          bottom: '-5%',
          left: '30%',
          background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.08) 0%, rgba(139, 92, 246, 0.06) 50%, transparent 80%)',
          filter: 'blur(90px)',
          transform: `translate3d(${offset.x * 0.4}px, ${offset.y * 0.4}px, 0)`,
          animation: 'nebulaPulse 9s ease-in-out infinite alternate',
        }}
      />

      {/* 微细全息点阵网格，增加维度感 */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.03,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <style>{`
        @keyframes nebulaPulse {
          0% {
            opacity: 0.6;
            transform: scale(0.95);
          }
          100% {
            opacity: 0.95;
            transform: scale(1.08);
          }
        }
      `}</style>
    </div>
  );
}
