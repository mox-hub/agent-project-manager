import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LivingNebulaBackground } from '../components/living-nebula-background';
import { LuminousSynapseOverlay } from '../components/luminous-synapse-overlay';
import { SquadCapsuleOrbit } from '../components/squad-capsule-orbit';
import { CognitiveCanvas } from '../components/cognitive-canvas';
import { TrustOrbitalLens } from '../components/trust-orbital-lens';
import { OmniDock } from '../components/omni-dock';
import {
  INITIAL_AGENTS,
  INITIAL_ARTIFACTS,
  INITIAL_MESSAGES,
  TRUST_DIMENSIONS,
  MEMORY_ATOMS,
} from '../mock-data';
import type { CognitiveMessage } from '../types';
import { Sparkles, ArrowLeft, Radio } from 'lucide-react';

export function AiSurfacePage() {
  const navigate = useNavigate();
  const [agents] = useState(INITIAL_AGENTS);
  const [artifacts] = useState(INITIAL_ARTIFACTS);
  const [messages, setMessages] = useState<CognitiveMessage[]>(INITIAL_MESSAGES);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('agent-pm');
  const [overallScore, setOverallScore] = useState(95.4);

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
    <div className="relative min-h-screen w-full overflow-x-hidden text-foreground flex flex-col font-sans">
      {/* 1. 有机极光呼吸背景 */}
      <LivingNebulaBackground />

      {/* 2. 突触光纤连线 */}
      <LuminousSynapseOverlay />

      {/* 3. 顶部微型全息导航条 (极其克制、无分割线) */}
      <header className="sticky top-0 z-40 w-full px-6 py-4 flex items-center justify-between backdrop-blur-md bg-transparent select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExitSurface}
            className="flex items-center justify-center size-8 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
            title="返回人类控制面"
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
              style={{ fontSize: 10, background: 'rgba(139, 92, 246, 0.2)', color: '#C4B5FD' }}
            >
              DUAL-SURFACE V4
            </span>
          </div>
        </div>

        {/* 右上角环境指示 */}
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground/70">
          <div className="flex items-center gap-1.5">
            <Radio className="size-3 animate-pulse" style={{ color: '#34D399' }} />
            <span>RUNTIME ACTIVE</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <span>PROJECT:</span>
            <span className="text-foreground">智能协同执行引擎</span>
          </div>
        </div>
      </header>

      {/* 4. 空间无界主视界：左侧胶囊 + 中央工件河流 + 右侧信度光轨 (无边框一体化) */}
      <main
        className="relative z-10 flex-1 flex justify-between gap-6 px-6 py-2 mx-auto w-full"
        style={{ maxWidth: 1600 }}
      >
        {/* 左翼：悬浮数字生命胶囊 */}
        <aside className="shrink-0 hidden lg:block sticky top-20 self-start">
          <SquadCapsuleOrbit
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(id) => setSelectedAgentId(id === selectedAgentId ? null : id)}
          />
        </aside>

        {/* 中央主视域：无界认知流与浮动工件 */}
        <section className="flex-1 min-w-0">
          <CognitiveCanvas
            messages={messages}
            artifacts={artifacts}
            onInspectArtifact={(id) => console.log('Inspect artifact', id)}
          />
        </section>

        {/* 右翼：信度全息光轨与反思透镜 */}
        <aside className="shrink-0 hidden xl:block sticky top-20 self-start">
          <TrustOrbitalLens
            dimensions={TRUST_DIMENSIONS}
            memoryAtoms={MEMORY_ATOMS}
            overallScore={overallScore}
          />
        </aside>
      </main>

      {/* 5. 悬浮全能交互坞 (Omni-Dock) */}
      <OmniDock
        onSendMessage={handleSendMessage}
        onExitSurface={handleExitSurface}
        activeAgentName={selectedAgent?.name}
      />
    </div>
  );
}
