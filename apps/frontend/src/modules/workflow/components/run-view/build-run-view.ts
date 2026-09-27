/**
 * Workflow v2 运行面板视图模型（CAP-S-03 呈现层，ZCode 工作流卡形态复刻）。
 * 纯函数：graphSummary（静态图投影）+ nodeRuns（journal 行）→ 站列视图模型。
 *
 * journal 键约定（server workflow-v2.engine）：nodeId + 后缀链
 * （fan-out → `@i{n}`、loop → `@r{n}`、condition 分支随子节点裸 id），
 * 裸节点 id = 首个 `@` 之前的部分；行归属站按「裸 id ∈ 站子树」判定。
 */
import type { WorkflowNodeRun } from '../../api/workflow-api';

/** graphSummary 成员（server summarizeV2Definition 投影的前端镜像） */
export interface V2NodeSummary {
  id: string;
  type: string;
  title?: string;
  agent?: { provider: string; targetMode: string };
  children?: V2NodeSummary[];
  then?: V2NodeSummary[];
  else?: V2NodeSummary[];
}

export type StationStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'waiting'
  | 'skipped';

/** 站下执行药丸（一次 journal 执行 = 一枚；未执行站回填静态模板药丸） */
export interface RunPill {
  /** journalKey（run 内唯一）；静态模板药丸为 `{stationId}:static:{nodeId}` */
  key: string;
  /** 裸节点 id */
  nodeId: string;
  /** 执行显示名（journal=节点 title/裸 id）；静态模板药丸缺省时组件层回落类型名 */
  label?: string;
  type: string;
  status: string;
  attempt: number;
  executionRunId?: string | null;
  error?: string | null;
}

/** 阶段站（根层节点的运行投影） */
export interface RunStation {
  id: string;
  type: string;
  title: string;
  status: StationStatus;
  /** journal 终态行数 / journal 总行数（0/0 时组件层隐藏徽标） */
  settled: number;
  total: number;
  /** loop 站轮数（@r 去重），非 loop 恒 0 */
  rounds: number;
  pills: RunPill[];
}

export interface RunViewStats {
  durationMs: number | null;
  phases: number;
  nodeExecs: number;
  agents: number;
}

export interface RunView {
  stations: RunStation[];
  stats: RunViewStats;
}

const TERMINAL_ROW_STATUS = new Set(['succeeded', 'failed', 'skipped']);

export function bareNodeId(journalKey: string): string {
  const at = journalKey.indexOf('@');
  return at === -1 ? journalKey : journalKey.slice(0, at);
}

function nodeTitle(node: V2NodeSummary): string {
  return node.title || node.id;
}

/** 站子树全量节点 id（children/then/else 递归） */
function collectSubtreeIds(node: V2NodeSummary, into: Set<string>): Set<string> {
  into.add(node.id);
  node.children?.forEach((c) => collectSubtreeIds(c, into));
  node.then?.forEach((c) => collectSubtreeIds(c, into));
  node.else?.forEach((c) => collectSubtreeIds(c, into));
  return into;
}

function stationStatus(rows: WorkflowNodeRun[]): StationStatus {
  if (rows.length === 0) return 'pending';
  const statuses = rows.map((r) => r.status);
  if (statuses.includes('failed')) return 'failed';
  if (statuses.includes('waiting')) return 'waiting';
  if (statuses.includes('running')) return 'running';
  if (statuses.every((s) => s === 'skipped')) return 'skipped';
  return 'done';
}

/**
 * 站态聚合输入：同裸节点 id 的多轮执行（loop `@r{n}`）只保留最新
 * journal 键一行——历史失败轮不把已通过的站染红；fan-out 不同实例
 * 是不同裸 id，互不覆盖。
 */
function latestRowsByBareId(rows: WorkflowNodeRun[]): WorkflowNodeRun[] {
  const latest = new Map<string, WorkflowNodeRun>();
  for (const r of rows) {
    const bare = bareNodeId(r.nodeId);
    const prev = latest.get(bare);
    if (!prev || r.nodeId > prev.nodeId) latest.set(bare, r);
  }
  return [...latest.values()];
}

/**
 * 合成运行视图。v1 run（graphSummary/nodeRuns 缺省）退化为空站列 +
 * 纯统计，面板组件按此裁剪布局。
 */
export function buildRunView(
  graphSummary: V2NodeSummary[] | null | undefined,
  nodeRuns: WorkflowNodeRun[] | undefined,
  run: { startedAt?: string | null; finishedAt?: string | null },
): RunView {
  const rows = nodeRuns ?? [];
  const byStation = new Map<string, WorkflowNodeRun[]>();
  const stations: RunStation[] = (graphSummary ?? []).map((root) => {
    const subtree = collectSubtreeIds(root, new Set<string>());
    const own = rows.filter((r) => subtree.has(bareNodeId(r.nodeId)));
    byStation.set(root.id, own);

    // 药丸：容器站展开子节点执行行；叶子站只收自身行
    const isContainer =
      root.type === 'fan-out' || root.type === 'loop' || root.type === 'condition';
    const pillRows = own.filter((r) => (isContainer ? subtree.has(bareNodeId(r.nodeId)) && bareNodeId(r.nodeId) !== root.id : bareNodeId(r.nodeId) === root.id));
    const sameIdSeen = new Map<string, number>();
    const pills: RunPill[] = pillRows.map((r) => {
      const bare = bareNodeId(r.nodeId);
      const staticNode = findNode(root, bare);
      const nth = (sameIdSeen.get(bare) ?? 0) + 1;
      sameIdSeen.set(bare, nth);
      const baseTitle = staticNode ? nodeTitle(staticNode) : bare;
      return {
        key: r.nodeId,
        nodeId: bare,
        label: sameIdSeen.get(bare)! > 1 ? `${baseTitle} #${nth}` : baseTitle,
        type: r.nodeType,
        status: r.status,
        attempt: r.attempt,
        executionRunId: r.executionRunId,
        error: r.error?.message ?? null,
      };
    });
    // 未执行站回填静态模板药丸（用户裁决 2026-09-27：预览即见子 agent/脚本载体，
    // 未执行显示未执行态；一旦有 journal 行则以实际执行为准，不混排）
    if (pills.length === 0) {
      const templateNodes =
        root.type === 'condition'
          ? [...(root.then ?? []), ...(root.else ?? [])]
          : (root.children ?? (isContainer ? [] : [root]));
      for (const child of templateNodes) {
        pills.push({
          key: `${root.id}:static:${child.id}`,
          nodeId: child.id,
          label: child.title,
          type: child.type,
          status: 'pending',
          attempt: 0,
        });
      }
    }

    const total = new Set(own.map((r) => r.nodeId)).size;
    const settled = new Set(
      own.filter((r) => TERMINAL_ROW_STATUS.has(r.status)).map((r) => r.nodeId),
    ).size;
    // loop 轮数：@r 后缀挂在子节点 journal 键（`{childId}@r{n}`），站内全局提取去重
    const rounds =
      root.type === 'loop'
        ? new Set(
            own
              .map((r) => r.nodeId.match(/@r(\d+)$/))
              .filter((m): m is RegExpMatchArray => !!m)
              .map((m) => Number(m[1])),
          ).size
        : 0;

    return {
      id: root.id,
      type: root.type,
      title: nodeTitle(root),
      status: stationStatus(latestRowsByBareId(own)),
      settled,
      total,
      rounds,
      pills,
    };
  });

  const startedAt = run.startedAt ? new Date(run.startedAt).getTime() : null;
  const finishedAt = run.finishedAt ? new Date(run.finishedAt).getTime() : null;
  const agentIds = new Set(
    rows.filter((r) => r.nodeType === 'agent').map((r) => bareNodeId(r.nodeId)),
  );

  return {
    stations,
    stats: {
      durationMs:
        startedAt !== null && finishedAt !== null && finishedAt >= startedAt
          ? finishedAt - startedAt
          : null,
      phases: stations.length,
      nodeExecs: rows.length,
      agents: agentIds.size,
    },
  };
}

function findNode(root: V2NodeSummary, id: string): V2NodeSummary | null {
  if (root.id === id) return root;
  for (const child of [...(root.children ?? []), ...(root.then ?? []), ...(root.else ?? [])]) {
    const hit = findNode(child, id);
    if (hit) return hit;
  }
  return null;
}

/** 时长 → {m, s}（组件层 i18n 拼装） */
export function splitDuration(durationMs: number | null): { m: number; s: number } {
  if (durationMs === null) return { m: 0, s: 0 };
  const totalSeconds = Math.round(durationMs / 1000);
  return { m: Math.floor(totalSeconds / 60), s: totalSeconds % 60 };
}
