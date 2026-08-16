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
  return matter.stringify(body, data as Record<string, unknown>);
}

export function mergeFrontmatter(
  body: string,
  overrides: Partial<DocumentFrontmatter>,
): string {
  const parsed = parseFrontmatter(body);
  const merged: DocumentFrontmatter = { ...parsed.data, ...overrides };
  // 保留解析时丢弃的未知键 (避免回写时丢失用户自有字段)
  if (parsed.raw && typeof parsed.raw === 'object') {
    const knownOverrideKeys = new Set(Object.keys(overrides));
    for (const [k, v] of Object.entries(parsed.raw)) {
      if (KNOWN_KEYS.has(k) || knownOverrideKeys.has(k)) continue;
      if (merged.custom && k in merged.custom) continue;
      merged.custom = { ...(merged.custom ?? {}), [k]: v };
    }
  }
  return stringifyFrontmatter(parsed.body, merged);
}
