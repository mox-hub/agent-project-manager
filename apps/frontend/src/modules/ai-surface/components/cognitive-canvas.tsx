import { useState } from 'react';
import type { CognitiveMessage, ArtifactItem } from '../types';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Sparkles,
  GitCompare,
  Layers,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Code2,
  FileCheck2,
} from 'lucide-react';

interface CognitiveCanvasProps {
  messages: CognitiveMessage[];
  artifacts: Record<string, ArtifactItem>;
  onInspectArtifact?: (artifactId: string) => void;
}

export function CognitiveCanvas({
  messages,
  artifacts,
  onInspectArtifact,
}: CognitiveCanvasProps) {
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({
    'msg-1': true,
    'msg-4': true,
  });
  const [copiedArtifactId, setCopiedArtifactId] = useState<string | null>(null);

  const toggleThoughts = (msgId: string) => {
    setExpandedThoughts((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleCopyCode = (artifactId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedArtifactId(artifactId);
    setTimeout(() => setCopiedArtifactId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full px-4 pb-32 pt-2 select-text">
      {/* 顶部空间提示 */}
      <div className="flex items-center justify-between px-2 pb-2 text-xs text-muted-foreground/60 uppercase tracking-widest font-mono">
        <div className="flex items-center gap-2">
          <Layers className="size-3 text-accent-purple" />
          <span>COGNITIVE RIVER / 认知流与动态工件</span>
        </div>
        <span>LIVE SYNAPSE 60FPS</span>
      </div>

      {/* 认知流消息时间轴 */}
      <div className="flex flex-col gap-6">
        {messages.map((msg) => {
          const artifact = msg.artifactId ? artifacts[msg.artifactId] : null;
          const isThoughtsOpen = !!expandedThoughts[msg.id];

          return (
            <div
              key={msg.id}
              className="relative group transition-all duration-300"
            >
              {/* 发言者角色全息条目 */}
              <div className="flex items-center gap-3 mb-2 px-1">
                <div
                  className="flex items-center justify-center size-6 rounded-lg text-xs font-semibold text-white shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)',
                    boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  {msg.avatar}
                </div>
                <span className="text-sm font-medium text-foreground tracking-tight">
                  {msg.senderName}
                </span>
                <span className="font-mono text-muted-foreground/60" style={{ fontSize: 11 }}>
                  {msg.timestamp}
                </span>
              </div>

              {/* 对话内容：无死板气泡，通透深空悬浮片 */}
              <div
                className="relative rounded-2xl p-4 transition-all duration-300 backdrop-blur-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.015) 100%)',
                  boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                }}
              >
                <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                  {msg.content}
                </p>

                {/* 思维链伸缩面板 (Chain of Thought) */}
                {msg.thoughts && msg.thoughts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => toggleThoughts(msg.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                    >
                      <Sparkles className="size-3 text-accent-purple" />
                      <span>推演思维链 ({msg.thoughts.length} 步)</span>
                      <ChevronDown
                        className={cn(
                          'size-3.5 transition-transform duration-200',
                          isThoughtsOpen && 'rotate-180',
                        )}
                      />
                    </button>

                    {isThoughtsOpen && (
                      <div className="mt-2.5 flex flex-col gap-2 pl-2 border-l border-white/10 animate-in fade-in duration-200">
                        {msg.thoughts.map((step) => (
                          <div key={step.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-accent-purple font-medium" style={{ fontSize: 11 }}>
                                ✦ {step.title}
                              </span>
                              <span className="text-muted-foreground/60 font-mono" style={{ fontSize: 10 }}>
                                {step.durationMs}ms
                              </span>
                            </div>
                            <p className="text-muted-foreground/80 mt-0.5 pl-3" style={{ fontSize: 11 }}>
                              {step.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 动态挂载的悬浮工件 (Artifact Sheet) */}
              {artifact && (
                <div
                  className="mt-3.5 rounded-2xl p-4 transition-all duration-300 backdrop-blur-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                    boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                  }}
                  id={`artifact-node-${artifact.id}`}
                >
                  {/* 工件头部 */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex items-center justify-center size-7 rounded-lg shrink-0 text-white"
                        style={{
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.6) 0%, rgba(139, 92, 246, 0.6) 100%)',
                          boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
                        }}
                      >
                        {artifact.type === 'architecture' && <Layers className="size-3.5" />}
                        {artifact.type === 'code-diff' && <GitCompare className="size-3.5" />}
                        {artifact.type === 'acceptance-criteria' && <FileCheck2 className="size-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">
                          {artifact.title}
                        </h4>
                        <p className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
                          {artifact.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* 工件操作按钮 */}
                    <div className="flex items-center gap-2 shrink-0">
                      {artifact.payload.codeSnippet && (
                        <button
                          type="button"
                          onClick={() => handleCopyCode(artifact.id, artifact.payload.codeSnippet!)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {copiedArtifactId === artifact.id ? (
                            <>
                              <Check className="size-3" style={{ color: '#34D399' }} />
                              <span style={{ fontSize: 11 }}>已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3" />
                              <span style={{ fontSize: 11 }}>复制</span>
                            </>
                          )}
                        </button>
                      )}
                      {onInspectArtifact && (
                        <button
                          type="button"
                          onClick={() => onInspectArtifact(artifact.id)}
                          className="text-xs px-2.5 py-1 rounded-lg text-accent-purple hover:bg-accent-purple/10 transition-colors font-medium"
                          style={{ fontSize: 11 }}
                        >
                          深度透视 ↗
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 工件载荷展示：架构规范 */}
                  {artifact.type === 'architecture' && artifact.payload.diagramSpec && (
                    <div className="mt-3 p-3 rounded-xl font-mono text-xs text-foreground/90 space-y-1.5"
                      style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                    >
                      {artifact.payload.diagramSpec.map((line, idx) => (
                        <div key={idx} className="leading-relaxed flex items-center gap-2">
                          <span className="text-accent-purple select-none opacity-60">❯</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 工件载荷展示：代码 Diff */}
                  {artifact.type === 'code-diff' && artifact.payload.codeSnippet && (
                    <div className="mt-3 rounded-xl overflow-hidden font-mono text-xs"
                      style={{ background: 'rgba(0, 0, 0, 0.45)' }}
                    >
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 text-muted-foreground" style={{ fontSize: 10 }}>
                        <div className="flex items-center gap-1.5">
                          <Code2 className="size-3" />
                          <span>prisma/schema.prisma</span>
                        </div>
                        <span>+4 lines</span>
                      </div>
                      <pre className="p-3 overflow-x-auto text-foreground/80 leading-relaxed" style={{ fontSize: 11 }}>
                        <code>
                          {artifact.payload.codeSnippet.split('\n').map((line, lIdx) => {
                            const isPlus = line.startsWith('+');
                            return (
                              <div
                                key={lIdx}
                                className={cn(
                                  'px-1 py-0.5 rounded',
                                  isPlus && 'font-medium',
                                )}
                                style={{
                                  backgroundColor: isPlus ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                                  color: isPlus ? '#34D399' : 'inherit',
                                }}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </code>
                      </pre>
                    </div>
                  )}

                  {/* 工件载荷展示：自动化验收准则 Checklist */}
                  {artifact.type === 'acceptance-criteria' && artifact.payload.criteriaList && (
                    <div className="mt-3 flex flex-col gap-2">
                      {artifact.payload.criteriaList.map((crit, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-start gap-2.5 p-2 rounded-xl text-xs"
                          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                        >
                          {crit.done ? (
                            <CheckCircle2 className="size-4 shrink-0 mt-0.5" style={{ color: '#34D399' }} />
                          ) : (
                            <Circle className="size-4 shrink-0 mt-0.5 text-muted-foreground/60" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={cn('text-foreground/90', crit.done && 'line-through text-muted-foreground')}>
                              {crit.label}
                            </span>
                            {crit.required && (
                              <span className="ml-2 px-1.5 py-0.2 rounded font-mono"
                                style={{ fontSize: 10, background: 'rgba(239, 68, 68, 0.15)', color: '#F87171' }}
                              >
                                必测
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
