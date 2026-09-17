import { useMemo } from 'react';
import { usePendingDecisions } from '@/modules/decision/hooks/use-decisions';
import type { Decision } from '@/shared/decision-card/types';

/**
 * 「该你了」待办队列（ARCH-AISURFACE-001 §3.1「右：该你了」）。
 *
 * ## 数据口径：不新增第二个拍板入口，也不新增第二个待决口径
 *
 * 队列**原样消费** `/decisions/pending`——那是决策收件箱同一个端点、同一个 hook
 * （`usePendingDecisions`）。三类待办（决策卡 / 待验收 / 待发布门禁）在该端点
 * 已被聚合为中性 `Decision` 投影：
 *   · 决策卡 = `kind` 属于建议类提案（plan/assignment/resolution/spend/clarify/gate/workflow_def/release）
 *   · 待验收 = `kind: 'acceptance'`
 *   · 待发布门禁 = `kind: 'release'`（`ReleaseService.createApprovalProposal` 投递）
 * 因此本模块**不做**三次取数、**不写**SQL、**不合并**多来源字段——多来源合并是
 * 服务端 decision 模块的职责（§4.7「不造第二套数据口径」）。
 *
 * ## 排序口径与收件箱不同（有意为之）
 *
 * 服务端在 blocking 优先的前提下按**发起时间倒序**（收件箱 = 最新在前的时间流）。
 * 盯盘面的语义是「现在最卡你的是什么」，故同级内改为**等待最久在前**：
 * 紧迫度是第一关键字，同级按 `createdAt` 升序。这是展示序，不是数据口径。
 */

/** 排序：blocking 优先；同级等待最久在前（升序 createdAt） */
export function sortDecisionQueue(items: readonly Decision[]): Decision[] {
  return [...items].sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency === 'blocking' ? -1 : 1;
    // createdAt 缺失/不可解析时排到同级末尾，**不**当"刚创建"插到最前
    // （那会让一条未知时间的项冒充"最急"）
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    const na = Number.isNaN(ta);
    const nb = Number.isNaN(tb);
    if (na !== nb) return na ? 1 : -1;
    if (na && nb) return 0;
    return ta - tb;
  });
}

export interface DecisionQueue {
  items: Decision[];
  /** 服务端给出的全量待决数（`items` 可能因分页少于它） */
  total: number;
  blocking: number;
  advisory: number;
  /** `total > items.length` 时说明还有多少项未被取出——不静默截断 */
  hiddenCount: number;
}

export function useDecisionQueue(projectId?: string, limit = 20): {
  queue: DecisionQueue;
  isPending: boolean;
  isError: boolean;
} {
  const query = usePendingDecisions(
    projectId ? { projectId, limit } : { limit },
  );

  const data = query.data;
  const queue = useMemo<DecisionQueue>(() => {
    const items = data?.items ?? [];
    const sorted = sortDecisionQueue(items);
    const total = data?.total ?? items.length;
    return {
      items: sorted,
      total,
      blocking: data?.blocking ?? 0,
      advisory: data?.advisory ?? 0,
      hiddenCount: Math.max(0, total - sorted.length),
    };
  }, [data]);

  return {
    queue,
    isPending: query.isPending,
    isError: query.isError,
  };
}
