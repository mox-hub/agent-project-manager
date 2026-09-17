/**
 * 决策提案内容指纹（CAP-C-04：批准绑定内容版本）。
 *
 * 缺口：批准与内容版本无绑定——提案内容改了，基于旧内容的「批准」依然被信任。
 * 本文件提供三件事：
 * 1. `computeProposalFingerprint`：对提案实质内容做稳定规范化后计算 sha256；
 * 2. `isApprovalStale`：批准是否过期（当前内容指纹 ≠ 批准时指纹 approvedFingerprint）；
 * 3. `assertFingerprintMatch`：决议瞬间的防 TOCTOU 校验（批准者所见指纹 ≠ 当前指纹即拒绝）。
 *
 * 实质内容口径（人批阅时判断的对象，缺一即视为「内容已变更」）：
 * - kind     —— 决定 applier 语义与 payload 的解释方式；
 * - title    —— 决策陈述（一句话问句）；
 * - detail   —— 补充说明（证据抽屉展示）；
 * - payload  —— 全部执行细节（选项、涉及对象、任务清单、预算值、workflow 定义等）；
 * - projectId / issueId —— 提案自身的挂靠对象（涉及对象的一部分）。
 * 不参与指纹：status、proposer*、resolution、resolvedBy/resolvedAt、expiresAt、
 * createdAt/updatedAt —— 这些是状态与留痕元数据，不是被批准的内容。
 *
 * 规范化口径（稳定优先，防「同内容不同指纹」）：
 * - 对象键递归排序（JS 键序是实现细节，不属于内容）；
 * - 字符串值 \r\n 归一为 \n、首尾空白 trim（编辑器/平台差异不属于内容变更）；
 * - 不压缩字符串内部连续空白：payload 可能承载代码/定义类文本，空白即内容，宁可保守；
 * - 数组保序（选项顺序、任务清单顺序本身是实质内容）；
 * - undefined 属性剔除（与 JSON 序列化语义一致）后 JSON.stringify（紧凑、键已排序）。
 */
import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';

/** 参与指纹的提案实质内容（与 DecisionProposal 对应字段子集） */
export interface ProposalFingerprintSource {
  kind: string;
  title: string;
  detail?: string | null;
  payload: unknown;
  projectId?: string | null;
  issueId?: string | null;
}

/** 携带 approvedFingerprint 的最小提案形态（stale 判定输入） */
export interface ProposalWithFingerprint extends ProposalFingerprintSource {
  status: string;
  approvedFingerprint?: string | null;
}

/** 字符串值的空白归一：\r\n → \n + 首尾 trim */
function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

/** 递归规范化：对象键排序、字符串空白归一、undefined 属性剔除 */
function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') return normalizeText(value);
  if (Array.isArray(value)) return value.map((v) => normalizeValue(v));
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, normalizeValue(v)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entries);
  }
  return value;
}

/** 实质内容 → 稳定规范化 JSON */
export function proposalFingerprintInput(
  source: ProposalFingerprintSource,
): string {
  const content = {
    kind: source.kind,
    title: source.title,
    detail: source.detail ?? null,
    payload: source.payload ?? null,
    projectId: source.projectId ?? null,
    issueId: source.issueId ?? null,
  };
  return JSON.stringify(normalizeValue(content));
}

/** 实质内容的 sha256 指纹（64 位小写 hex） */
export function computeProposalFingerprint(
  source: ProposalFingerprintSource,
): string {
  return createHash('sha256')
    .update(proposalFingerprintInput(source))
    .digest('hex');
}

/**
 * 批准是否过期（CAP-C-04 核心判定）：
 * 仅对「已批准（accepted）且留有批准时指纹」的提案判定；
 * pending 未批准谈不上过期；存量已决议行（加列前批准）无指纹，
 * 无法判定版本——视为不适用（返回 false），不制造存量误报。
 */
export function isApprovalStale(
  proposal: ProposalWithFingerprint,
  currentFingerprint = computeProposalFingerprint(proposal),
): boolean {
  if (proposal.status !== 'accepted') return false;
  if (!proposal.approvedFingerprint) return false;
  return proposal.approvedFingerprint !== currentFingerprint;
}

/**
 * 决议瞬间的一致性校验（防 TOCTOU）：批准者提交 `expectedFingerprint`
 * （其打开卡片/读取列表时服务端下发的当前内容指纹），与服务端当前指纹比对，
 * 不匹配说明决议期间内容已实质变更——拒绝沿用旧印象的决议，要求刷新重批。
 * 未携带（旧客户端 / AI 工具直连）不拦截：拦截语义由批准留痕 + stale 判定兜底。
 */
export function assertFingerprintMatch(
  expected: string | undefined,
  current: string,
): void {
  if (expected !== undefined && expected !== current) {
    throw new ConflictException(
      '提案内容已实质变更，本次决议基于旧版本内容被拒绝；请刷新后基于最新内容重新决议',
    );
  }
}
