import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  assistantApi,
  type AssistantSilentUsage,
} from '@/modules/assistant/api/assistant-api';
import {
  snapshotHasFacts,
  type SurfaceSnapshot,
} from '../adapters/surface-snapshot';
import {
  buildTemplateNarration,
  parseSurfaceNarration,
  type SurfaceNarration,
} from '../adapters/surface-narration';

/**
 * AI 状态叙述（ARCH-AISURFACE-001 §3.3）。
 *
 * ## 四条硬约束在这里怎么落地
 *
 * ① **事实与叙事分离**：事实由 `buildSurfaceSnapshot` 算好后整体注入，模型只翻译；
 *    模型编出来的 `decisionId` 会被解析层挡掉（见 `parseSurfaceNarration`）。
 * ② **成本纪律**：`staleTime = TTL`；快照变化只在**缓存已过 TTL** 时才触发重取，
 *    因此事件洪峰下每个 TTL 窗口最多一次模型调用，**绝不逐事件调**；页面不可见时不取。
 *    每次调用的自身开销经 `usage` 回执出去供 UI 呈现（叙述自己的花费也必须可见）。
 * ③ **确定性降级**：模型挂了 / 超时 / 输出不成形 → 回落 `buildTemplateNarration`，
 *    状态置 `degraded`，UI 必须就地标注"规则生成的摘要"。**盯盘不因 AI 挂了白屏。**
 * ④ **不主动弹窗**：本 hook 只产数据，展示与否由页面决定。
 */

/** 叙述新鲜度窗口（§3.3：≈30s）。也是"两次模型调用之间的最小间隔"。 */
export const NARRATION_TTL_MS = 30_000;

export type NarrationState = 'idle' | 'pending' | 'ready' | 'degraded';

export interface UseSurfaceNarrationResult {
  narration: SurfaceNarration | null;
  /** 本次叙述自身的开销；provider 未上报时为 undefined（不补 0） */
  usage?: AssistantSilentUsage;
  state: NarrationState;
  /** 降级原因（人话）；仅在 `state === 'degraded'` 时有值 */
  degradedNote?: string;
  /** 叙述生成时刻；null = 还没有内容 */
  generatedAt: number | null;
  /** 手动刷新（用户显式意图，绕过 TTL） */
  refresh: () => void;
}

/** 页面是否可见——不可见就不该花 token（§3.3 约束②） */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

/** 降级原因转人话（不暴露原始报错文本给小白，但也**不**说成"AI 正在思考"） */
function degradedNoteFor(error: unknown, parsedMissing: boolean): string {
  if (parsedMissing) return 'AI 返回的内容不成形，以下为规则生成的摘要';
  const message = error instanceof Error ? error.message : '';
  if (/provider|模型|LLM/i.test(message)) {
    return '当前没有可用的 AI 模型，以下为规则生成的摘要';
  }
  return 'AI 服务暂时不可用，以下为规则生成的摘要';
}

export function useSurfaceNarration(
  snapshot: SurfaceSnapshot,
  options: { projectId?: string; enabled?: boolean } = {},
): UseSurfaceNarrationResult {
  const { projectId } = options;
  const visible = usePageVisible();
  const hasFacts = snapshotHasFacts(snapshot);
  const enabled = (options.enabled ?? true) && visible && hasFacts;

  // queryFn 读**最新快照的 ref**，而**不**把快照放进 queryKey：
  // 投影层每来一条事件就换一次快照引用，入 key 等于逐事件调模型——正是约束②禁止的。
  // 初值给首个快照（首屏那次取数读到的就是它），其后由 effect 同步——**不在 render 期间写 ref**。
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // 事实签名：只在**事实真的变了**时才进入"考虑重取"分支
  const signature = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  const query = useQuery({
    queryKey: ['ai-surface', 'narration', projectId ?? null],
    queryFn: () =>
      assistantApi.silent('surface-narration', {
        projectId,
        context: { snapshot: snapshotRef.current },
      }),
    enabled,
    staleTime: NARRATION_TTL_MS,
    retry: false,
    // 焦点重取交给下面的可见性分支统一管，避免两套触发条件互相打脸
    refetchOnWindowFocus: false,
  });

  const { dataUpdatedAt, refetch } = query;

  // 事实变化 → 仅在缓存已过 TTL 时重取（一个 TTL 窗口内最多一次调用）
  useEffect(() => {
    if (!enabled || dataUpdatedAt === 0) return;
    if (Date.now() - dataUpdatedAt < NARRATION_TTL_MS) return;
    void refetch();
    // signature 变化才触发；refetch 身份稳定
  }, [signature, enabled, dataUpdatedAt, refetch]);

  // 从后台切回前台：过期就补一次（这正是 §3.3「可见性触发」）
  const wasHiddenRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      wasHiddenRef.current = true;
      return;
    }
    if (!wasHiddenRef.current) return;
    wasHiddenRef.current = false;
    if (dataUpdatedAt !== 0 && Date.now() - dataUpdatedAt < NARRATION_TTL_MS) {
      return;
    }
    void refetch();
  }, [visible, dataUpdatedAt, refetch]);

  const parsed = useMemo(
    () => (query.data ? parseSurfaceNarration(query.data.data, snapshot) : null),
    [query.data, snapshot],
  );

  // 拿不到成形输出就降级——但只在**确实有事实可讲**时降级，
  // 无事实的空白页给模板只会产出一句"没有同事"的空话。
  const parsedMissing = query.isSuccess && !parsed;
  const degraded = (query.isError || parsedMissing) && hasFacts;
  const template = useMemo(
    () => (degraded ? buildTemplateNarration(snapshot) : null),
    [degraded, snapshot],
  );

  const narration = parsed ?? template;

  const state: NarrationState = narration
    ? narration.source === 'ai'
      ? 'ready'
      : 'degraded'
    : query.isFetching && enabled
      ? 'pending'
      : 'idle';

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    narration,
    usage: query.data?.usage,
    state,
    degradedNote: template
      ? degradedNoteFor(query.error, parsedMissing)
      : undefined,
    generatedAt: query.data ? dataUpdatedAt || null : null,
    refresh,
  };
}
