/**
 * apm:// 实体引用方言（契约与文档知识层 v2 纪要 §13）。
 *
 * 文本层形态：标准 CommonMark 链接，href = apm://{projectCode}/{kind}/{shortId}
 * 如 `apm://apm/doc/D17`。纯函数、无 IO——解析责任分层：
 *   - 本模块：方言 parse/format/应用路由前缀映射（双端同源）；
 *   - 后端：kind=doc 的 shortId → 实体（Document.findOne 兼容 shortId 查询）；
 *   - 前端：chip 渲染 + 点击展开（expandApmRefToPath → react-router navigate）。
 * 通道 A（仓库内文件）里外部 AI 读到 apm:// 原文即可凭 catalog 理解，无需工具。
 */

export const APM_REF_SCHEME = 'apm';

export const APM_REF_KINDS = [
  'doc',
  'issue',
  'bug',
  'member',
  'team',
  'acceptance',
  'release',
] as const;

export type ApmRefKind = (typeof APM_REF_KINDS)[number];

export interface ApmRef {
  /** 项目代码（Project.projectCode），apm:// 命名空间 */
  projectCode: string;
  kind: ApmRefKind;
  /** 实体短号（文档 D{seq}、工单 {PREFIX}-{seq}） */
  shortId: string;
}

const KIND_SET: ReadonlySet<string> = new Set(APM_REF_KINDS);

/** kind → 应用内路由前缀（与前端 route-preview-registry 的 DYNAMIC_RULES 对齐） */
export const APM_REF_ROUTE_PREFIX: Record<ApmRefKind, string | null> = {
  doc: '/app/documents',
  issue: '/app/issues',
  bug: '/app/bugs',
  member: '/app/members',
  team: '/app/teams',
  acceptance: '/app/acceptance',
  // 发版详情页尚未存在（1b V1 无 REST 面），仅可 parse 不可展开
  release: null,
};

/** 是否为 apm:// 引用（不校验 kind 与段合法性，供快速分流） */
export function isApmRef(href: string | null | undefined): href is string {
  if (!href) return false;
  return href.toLowerCase().startsWith(`${APM_REF_SCHEME}:`);
}

/**
 * 解析 apm://{projectCode}/{kind}/{shortId}。
 * 容错：scheme 大小写不敏感、`apm:/`（单斜杠）归一；
 * projectCode/shortId 非空、kind 必须在枚举内；其余形态返回 null。
 */
export function parseApmRef(href: string | null | undefined): ApmRef | null {
  if (!isApmRef(href)) return null;
  const rest = href!.slice(APM_REF_SCHEME.length + 1).replace(/^\//, '');
  const segments = rest.split('/').filter((s) => s.length > 0);
  if (segments.length !== 3) return null;
  const [projectCode, rawKind, shortId] = segments;
  const kind = rawKind.toLowerCase();
  if (!KIND_SET.has(kind)) return null;
  if (!projectCode || !shortId) return null;
  return { projectCode, kind: kind as ApmRefKind, shortId };
}

/** 结构 → 方言字符串（parse 的逆，往返幂等） */
export function formatApmRef(ref: ApmRef): string {
  return `${APM_REF_SCHEME}://${ref.projectCode}/${ref.kind}/${ref.shortId}`;
}

/**
 * 展开为应用内路径：`{routePrefix}/{resolvedId}`。
 * 解析回调负责 shortId → 路由可用的实体标识（前端可传 cuid；
 * 文档场景可直接透传 shortId——Document.findOne 已兼容短号查询）。
 * 无法展开（未知 kind / 解析失败）返回 null，调用方降级处理。
 */
export function expandApmRefToPath(
  ref: ApmRef,
  resolveId: (ref: ApmRef) => string | null,
): string | null {
  const prefix = APM_REF_ROUTE_PREFIX[ref.kind];
  if (!prefix) return null;
  const id = resolveId(ref);
  if (!id) return null;
  return `${prefix}/${id}`;
}
