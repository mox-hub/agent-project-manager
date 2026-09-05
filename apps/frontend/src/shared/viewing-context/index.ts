/**
 * 「正在查看」上下文上报 —— 详情页在拿到实体数据后调用，
 * AI 助手侧边栏据此感知用户正在浏览的内容并随消息附带（可被用户移除）。
 * 卸载或实体切换时自动清除/更新，避免残留旧上下文。
 */
import { useEffect } from 'react';
import {
  useAppStore,
  type ViewingContext,
} from '@/infrastructure/store/app-store';

export type { ViewingContext, ViewingEntityType } from '@/infrastructure/store/app-store';

export function useSetViewingContext(viewing: ViewingContext | null | undefined) {
  const setViewing = useAppStore((s) => s.setViewing);
  // 序列化作为依赖签名：id/type/title 任一变化才重新上报
  const serialized = viewing ? JSON.stringify(viewing) : null;

  useEffect(() => {
    setViewing(serialized ? (JSON.parse(serialized) as ViewingContext) : null);
    return () => setViewing(null);
  }, [serialized, setViewing]);
}
