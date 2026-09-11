import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/shared/theme/theme-context';
import { LivingNebulaBackground } from '../components/living-nebula-background';
import { LuminousSynapseOverlay } from '../components/luminous-synapse-overlay';
import { RadialWatchDeck } from '../components/radial-watch-deck';
import { OmniDock } from '../components/omni-dock';
import {
  INITIAL_AGENTS,
  INITIAL_ARTIFACTS,
  INITIAL_MESSAGES,
  TRUST_DIMENSIONS,
  MEMORY_ATOMS,
} from '../mock-data';
import type { CognitiveMessage } from '../types';
import { Sparkles, ArrowLeft, Radio, Sun, Moon, Maximize2, Minimize2 } from 'lucide-react';

export function AiSurfacePage() {
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';

  const [agents] = useState(INITIAL_AGENTS);
  const [artifacts] = useState(INITIAL_ARTIFACTS);
  const [messages, setMessages] = useState<CognitiveMessage[]>(INITIAL_MESSAGES);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('agent-pm');
  const [overallScore, setOverallScore] = useState(95.4);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // 处理 Omni-Dock 发送消息
  const handleSendMessage = useCallback((text: string, model: string) => {
    const userMsg: CognitiveMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user-human',
      senderName: '人类指挥官 (You)',
      senderRole: 'pm',
      avatar: '👤',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);

    // 模拟 Agent 快速智能回应
    setTimeout(() => {
      const activeAgent = selectedAgent ?? agents[1]; // 默认 DaVinci 或选中者
      const replyMsg: CognitiveMessage = {
        id: `msg-reply-${Date.now()}`,
        senderId: activeAgent.id,
        senderName: `${activeAgent.name} (${activeAgent.roleTitle})`,
        senderRole: activeAgent.role,
        avatar: activeAgent.avatar,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `已收到您的指令「${text}」。已调用模型 ${model} 进行全局依赖图遍历，所有治理指标正常，正推进下一步落地。`,
        thoughts: [
          {
            id: `th-${Date.now()}`,
            title: '多智能体共识验证',
            description: `调度 ${activeAgent.name} 执行语义解析，信度评分微调中`,
            durationMs: 380,
            status: 'done',
          },
        ],
      };

      setMessages((prev) => [...prev, replyMsg]);
      setOverallScore((s) => Math.min(99.9, Number((s + 0.3).toFixed(1))));
    }, 900);
  }, [selectedAgent, agents]);

  // 返回人类控制面
  const handleExitSurface = useCallback(() => {
    navigate('/app/projects/dashboard');
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto overflow-x-hidden text-foreground flex flex-col font-sans select-none"
      style={{
        backgroundColor: isDark ? '#07080c' : '#F5F7FC',
      }}
    >
      {/* 1. 有机极光呼吸背景（双模态） */}
      <LivingNebulaBackground isDark={isDark} />

      {/* 2. 突触光纤连线 */}
      <LuminousSynapseOverlay />

      {/* 3. 顶部全屏微型全息导航条 (极其克制、通透) */}
      <header className="sticky top-0 z-40 w-full px-6 py-3.5 flex items-center justify-between backdrop-blur-md bg-transparent select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExitSurface}
            className="flex items-center justify-center size-8 rounded-xl hover:opacity-80 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
            }}
            title="返回人类控制面 (Esc)"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center size-6 rounded-lg text-xs font-semibold text-white"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                boxShadow: '0 0 14px rgba(139, 92, 246, 0.5)',
              }}
            >
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              APM SYNTHETIC COGNITIVE SURFACE
            </span>
            <span
              className="px-2 py-0.5 rounded-full font-mono font-medium ml-1"
              style={{
                fontSize: 10,
                background: isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(99, 102, 241, 0.15)',
                color: isDark ? '#C4B5FD' : '#4F46E5',
              }}
            >
              DUAL-SURFACE V4
            </span>
          </div>
        </div>

        {/* 右上角控制与指示 */}
        <div className="flex items-center gap-3 text-xs font-mono">
          {/* 日夜模式切换 */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            style={{
              fontSize: 11,
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
            }}
            title={isDark ? '切换至日间模式' : '切换至夜间模式'}
          >
            {isDark ? (
              <Sun className="size-3.5" style={{ color: '#FBBF24' }} />
            ) : (
              <Moon className="size-3.5" style={{ color: '#6366F1' }} />
            )}
            <span>{isDark ? '深空' : '明眸'}</span>
          </button>

          {/* 全屏切换 */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            style={{
              fontSize: 11,
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
            }}
            title={isFullscreen ? '退出全屏模式' : '进入真正全屏模式'}
          >
            {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            <span>{isFullscreen ? '窗口' : '全屏'}</span>
          </button>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
            style={{
              fontSize: 11,
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
            }}
          >
            <Radio className="size-3 animate-pulse" style={{ color: '#34D399' }} />
            <span style={{ color: '#34D399' }}>ACTIVE</span>
          </div>
        </div>
      </header>

      {/* 4. 空间主视界：中间手表圆形表盘 + 左右水平环绕卡片 + 闪光接线 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 mx-auto w-full pb-32 overflow-x-auto no-scrollbar">
        <RadialWatchDeck
          agents={agents}
          selectedAgentId={selectedAgentId}
          onSelectAgent={(id) => setSelectedAgentId(id === selectedAgentId ? null : id)}
          dimensions={TRUST_DIMENSIONS}
          memoryAtoms={MEMORY_ATOMS}
          overallScore={overallScore}
          artifacts={artifacts}
          messages={messages}
          isDark={isDark}
          onApproveWorkstream={(key) => {
            console.log('Workstream approved:', key);
          }}
        />
      </main>

      {/* 5. 悬浮全能交互坞 (Omni-Dock) */}
      <OmniDock
        onSendMessage={handleSendMessage}
        onExitSurface={handleExitSurface}
        activeAgentName={selectedAgent?.name}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />
    </div>
  );
}
