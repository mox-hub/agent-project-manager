import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { create } from 'zustand';

/**
 * 管道项目聚焦（CAP-A-15）：研发生命周期六站的统一项目过滤上下文。
 *
 * 语义裁决：不引入全局「当前项目」；侧边栏 pipeline 分组头部提供「项目聚焦」
 * 筛选器，选中值经 URL `?project=<projectId>`（统一参数名）联动六站过滤。
 * URL 优先：直开带参覆盖 store；无参时回落 store 值（会话内记忆，不持久化）。
 */

/** URL 统一参数名（release 列表页等深链消费方同用此名） */
export const PIPELINE_FOCUS_PARAM = 'project';

interface PipelineFocusState {
  focusProjectId: string | null;
  setFocus: (id: string | null) => void;
}

/** 轻量 zustand store（不 persist）：筛选器写入，六站页面消费 */
export const usePipelineFocusStore = create<PipelineFocusState>((set) => ({
  focusProjectId: null,
  setFocus: (id) => set({ focusProjectId: id }),
}));

/**
 * 管道项目聚焦 hook（URL 优先）：
 * - URL `?project` 有值 → 返回该值，并在 effect 中覆盖写回 store（直开带参落地）
 * - URL 无值 → 返回 store 值或 null
 * - setProjectId(id)：同时写 store + 更新当前路由 searchParams（保留其他参数）
 */
export function usePipelineProjectFilter(): {
  focusProjectId: string | null;
  setProjectId: (id: string | null) => void;
} {
  const focusProjectId = usePipelineFocusStore((s) => s.focusProjectId);
  const setFocus = usePipelineFocusStore((s) => s.setFocus);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get(PIPELINE_FOCUS_PARAM);

  // URL → store 写回：仅在 URL 参数发生「变化」（边沿）且新值非空时执行——
  // 直开带参 / 外部改参（前进后退）才覆盖 store。若只看当前值，setProjectId
  // 的路由传播窗口（旧参数尚未卸下）会把旧值灌回 store，破坏「全部项目」清空。
  // ref 只在 effect 内读写（记录上一帧 URL 值），不触渲染期 ref 红线。
  const prevUrlProjectId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const prev = prevUrlProjectId.current;
    prevUrlProjectId.current = urlProjectId;
    if (urlProjectId && urlProjectId !== prev && urlProjectId !== focusProjectId) {
      setFocus(urlProjectId);
    }
  }, [urlProjectId, focusProjectId, setFocus]);

  const setProjectId = useCallback(
    (id: string | null) => {
      setFocus(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set(PIPELINE_FOCUS_PARAM, id);
          else next.delete(PIPELINE_FOCUS_PARAM);
          return next;
        },
        { replace: true },
      );
    },
    [setFocus, setSearchParams],
  );

  return { focusProjectId: urlProjectId ?? focusProjectId, setProjectId };
}
