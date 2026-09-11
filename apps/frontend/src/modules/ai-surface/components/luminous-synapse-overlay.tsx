/**
 * 全屏发光突触微光层 (Luminous Synapse Overlay)
 * 在底层无感绘制微光贝塞尔光缆，视觉上传达出 Agent 思考与中央工件的实时流淌感。
 */
export function LuminousSynapseOverlay() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 size-full select-none z-0 opacity-40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="synapseGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#34D399" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.1" />
        </linearGradient>

        <linearGradient id="synapseGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* 虚拟光丝 1：从左侧编队流向中央工件 */}
      <path
        d="M 280 200 C 380 200, 420 320, 560 320"
        fill="none"
        stroke="url(#synapseGradient1)"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        style={{
          animation: 'dashFlow 20s linear infinite',
        }}
      />

      {/* 虚拟光丝 2：从中央工件流向右侧信度光轨 */}
      <path
        d="M 880 400 C 960 400, 1020 280, 1140 280"
        fill="none"
        stroke="url(#synapseGradient2)"
        strokeWidth="1.2"
        strokeDasharray="4 6"
        style={{
          animation: 'dashFlow 15s linear infinite reverse',
        }}
      />

      <style>{`
        @keyframes dashFlow {
          from {
            stroke-dashoffset: 200;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
}
