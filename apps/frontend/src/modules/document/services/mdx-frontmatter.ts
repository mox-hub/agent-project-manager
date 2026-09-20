import matter from 'gray-matter';

/**
 * Obsidian 兼容的 frontmatter 白名单 (Phase 5):
 *   - title, author, tags (数组或逗号分隔字符串, 标准化为数组)
 *   - aliases (数组) - 别名
 *   - cssclass - UI 样式类
 *   - created, updated, published (ISO 日期)
 *   - status (draft|reviewing|published|rejected) - 镜像 Document.status
 *   - project (string, projectCode) - 镜像 Document.projectId
 *   - module (string, 模块代码) - 与 shortId 关联
 *   - short_id (string) - 文档级 short ID
 *   - custom (自由 KV 桶) - 不解析, 原样保留
 */
export interface DocumentFrontmatter {
  title?: string;
  author?: string;
  tags?: string[];
  aliases?: string[];
  cssclass?: string;
  category?: string;
  created?: string;
  updated?: string;
  published?: string;
  status?: 'draft' | 'reviewing' | 'published' | 'rejected';
  project?: string;
  module?: string;
  short_id?: string;
  summary?: string;
  coverImage?: string;
  draft?: boolean;
  custom?: Record<string, unknown>;
}

export interface ParsedContent {
  data: DocumentFrontmatter;
  body: string;
  raw: Record<string, unknown>;
}

const KNOWN_KEYS = new Set([
  'title',
  'author',
  'tags',
  'aliases',
  'cssclass',
  'category',
  'created',
  'updated',
  'published',
  'status',
  'project',
  'module',
  'short_id',
  'summary',
  'coverImage',
  'draft',
]);

// 属性面板的键分类
const LIST_KEYS = new Set(['tags', 'aliases']);
const DATE_KEYS = new Set(['created', 'updated', 'published']);
// 与数据库/审批流镜像的系统键, 面板只读
export const SYSTEM_KEYS = new Set(['title', 'status', 'project', 'module', 'short_id']);

export type FrontmatterPropertyType = 'text' | 'list' | 'number' | 'boolean' | 'date';

export interface FrontmatterProperty {
  key: string;
  /** 原始 YAML 值（保留数字/布尔/数组原始类型） */
  value: unknown;
  type: FrontmatterPropertyType;
  readonly: boolean;
}

export interface ParsedProperties {
  properties: FrontmatterProperty[];
  body: string;
  /** 内容以 --- 开头但 YAML 解析失败：面板降级为只读警示，禁止写回（写回会把残块吞进正文） */
  malformed: boolean;
}

function inferPropertyType(key: string, value: unknown): FrontmatterPropertyType {
  if (Array.isArray(value)) return 'list';
  if (LIST_KEYS.has(key) && typeof value === 'string') return 'list';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (DATE_KEYS.has(key) && typeof value === 'string') return 'date';
  return 'text';
}

/** 已知键的属性类型（与值无关），供属性面板「添加属性」推断值编辑器形态 */
export function getPropertyKeyType(key: string): FrontmatterPropertyType {
  if (LIST_KEYS.has(key)) return 'list';
  if (key === 'draft') return 'boolean';
  if (DATE_KEYS.has(key)) return 'date';
  return 'text';
}

// --- 畸形 frontmatter 闸门 ---
// gray-matter 4 (js-yaml 3) 有状态 bug：进程内首次解析抛错后，后续对畸形
// YAML 的解析会静默"成功"（data={}, content=原文）。因此不能依赖它抛错，
// 先自提边界块，再用"解析成功但数据为空、块内却有实质内容"的回退签名兜底。
// 正则用 \s 而非 [ \t] 字符类：同时兼容 CRLF，也避免 lint:tokens 把
// 连字符接方括号误判为 Tailwind 任意值；闭包处 \n? 兼容空 frontmatter（---\n---\n）。
const FM_BLOCK = /^---\s*\n([\s\S]*?)\n?---\s*(?:\n|$)/;

function hasSubstantiveYamlLine(yamlText: string): boolean {
  return yamlText
    .split('\n')
    .some((line) => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('#');
    });
}

interface StrictParse {
  dataObj: Record<string, unknown>;
  body: string;
  malformed: boolean;
  /** 是否存在 frontmatter 块（畸形也算有） */
  hasBlock: boolean;
}

function parseFrontmatterStrict(content: string): StrictParse {
  if (!content.trimStart().startsWith('---')) {
    return { dataObj: {}, body: content, malformed: false, hasBlock: false };
  }
  const block = FM_BLOCK.exec(content);
  if (!block) {
    return { dataObj: {}, body: content, malformed: true, hasBlock: true };
  }
  try {
    const { data, content: body } = matter(content);
    const dataObj = (data ?? {}) as Record<string, unknown>;
    if (Object.keys(dataObj).length === 0 && hasSubstantiveYamlLine(block[1])) {
      // js-yaml@3 状态 bug 的静默降级签名：块被丢弃，原文整体当 body
      return { dataObj: {}, body: content, malformed: true, hasBlock: true };
    }
    return { dataObj, body, malformed: false, hasBlock: true };
  } catch {
    return { dataObj: {}, body: content, malformed: true, hasBlock: true };
  }
}

/**
 * Obsidian 式属性解析：按 YAML 键序全量输出（不做白名单过滤），
 * 已知键给类型标记，未知键原样呈现。与 parseFrontmatter 的差异：
 * 那个面向类型化消费（summary/tags 镜像），这个面向属性面板的完整编辑。
 */
export function parseFrontmatterProperties(content: string): ParsedProperties {
  const { dataObj, body, malformed } = parseFrontmatterStrict(content);
  if (malformed) {
    return { properties: [], body: content, malformed: true };
  }
  const properties = Object.entries(dataObj).map(([key, value]) => ({
    key,
    value,
    type: inferPropertyType(key, value),
    readonly: SYSTEM_KEYS.has(key),
  }));
  return { properties, body, malformed: false };
}

/**
 * 属性写回：增/改/删任意顶层键（含白名单外键），body 不动。
 * null / undefined / 空串 / 空数组语义为删除该键（与 Obsidian 清空值即摘除属性一致）。
 * 畸形 frontmatter 直接原样返回，拒绝把解析残块写进正文。
 */
export function setFrontmatterProperties(
  content: string,
  props: Record<string, unknown | null | undefined>,
): string {
  const { dataObj, body, malformed } = parseFrontmatterStrict(content);
  if (malformed) return content;
  const raw = { ...dataObj };
  for (const [key, value] of Object.entries(props)) {
    const isEmptyList = Array.isArray(value) && value.length === 0;
    if (value === null || value === undefined || value === '' || isEmptyList) {
      delete raw[key];
      continue;
    }
    raw[key] = value;
  }
  return stringifyFrontmatter(body, raw);
}

function toStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : String(v)))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return undefined;
}

export function parseFrontmatter(content: string): ParsedContent {
  if (!content.trim().startsWith('---')) {
    return { data: {}, body: content, raw: {} };
  }
  try {
    const { data, content: body } = matter(content);
    const dataObj = (data ?? {}) as Record<string, unknown>;
    const result: DocumentFrontmatter = {};

    for (const [key, value] of Object.entries(dataObj)) {
      if (!KNOWN_KEYS.has(key)) continue;
      switch (key) {
        case 'tags':
        case 'aliases': {
          const arr = toStringArray(value);
          if (arr && arr.length > 0) result[key] = arr;
          break;
        }
        case 'status': {
          if (typeof value === 'string') {
            const v = value.toLowerCase();
            if (v === 'draft' || v === 'reviewing' || v === 'published' || v === 'rejected') {
              result.status = v;
            }
          }
          break;
        }
        case 'draft': {
          if (typeof value === 'boolean') result.draft = value;
          break;
        }
        default: {
          if (value == null) continue;
          (result as Record<string, unknown>)[key] = String(value);
        }
      }
    }

    // 收集未知键到 custom 桶
    const customEntries = Object.entries(dataObj).filter(([k]) => !KNOWN_KEYS.has(k));
    if (customEntries.length > 0) {
      result.custom = Object.fromEntries(customEntries);
    }

    return { data: result, body, raw: dataObj };
  } catch {
    // 解析失败: 降级为 body 模式
    return { data: {}, body: content, raw: {} };
  }
}

export function stringifyFrontmatter(
  body: string,
  data: Partial<DocumentFrontmatter>,
): string {
  // js-yaml dump 遇到 undefined 值会抛 "unacceptable kind of an object to dump"，
  // 调用方（编辑页保存）会传 summary: undefined 这类稀疏元数据，先剥掉
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  );
  return matter.stringify(body, cleaned as Record<string, unknown>);
}

export function mergeFrontmatter(
  body: string,
  overrides: Partial<DocumentFrontmatter>,
): string {
  const parsed = parseFrontmatter(body);
  const merged: DocumentFrontmatter = { ...parsed.data, ...overrides };
  // 未知键按顶层键写回（Obsidian 语义：属性即顶层 frontmatter 键）。
  // 旧实现把它们塞进 custom: {} 嵌套落盘，源文件键位在每次保存后漂移。
  const raw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.raw)) {
    if (!KNOWN_KEYS.has(k)) raw[k] = v;
  }
  for (const [k, v] of Object.entries(merged)) {
    if (k === 'custom') continue;
    raw[k] = v;
  }
  // 历史数据曾以 custom: {k: v} 嵌套落盘，读取后展平回顶层
  for (const [k, v] of Object.entries(merged.custom ?? {})) {
    if (k in raw) continue;
    raw[k] = v;
  }
  return stringifyFrontmatter(parsed.body, raw);
}
