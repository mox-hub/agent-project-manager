import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const matter = require('gray-matter');

/**
 * 契约文件区间引擎（契约与文档知识层 v2 纪要 §5.2）。
 *
 * 设计约束：不做全文件 parse→serialize；只对 frontmatter 与
 * `<!-- BEGIN/END apm:managed:{id} -->` 托管区间做结构化处理，
 * 自由区字节 verbatim——未涉及的区间与自由区在写入操作中永不改写。
 *
 * 托管区间规范形态：
 *   <!-- BEGIN apm:managed:{id} -->\n{content}\n<!-- END apm:managed:{id} -->
 * id 仅允许 [A-Za-z0-9_-]+；区间内容首尾空白在解析时规范化去除。
 */

export const MANAGED_BLOCK_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const BEGIN_RE = /<!--\s*BEGIN apm:managed:([A-Za-z0-9_-]+)\s*-->/g;

export interface ManagedBlockSpan {
  id: string;
  /** 区间内部文本（首尾空白规范化去除，不含标记行） */
  inner: string;
  /** 区间整体在原文中的起点（含 BEGIN 标记行首字节） */
  start: number;
  /** 区间整体在原文中的终点（END 标记行尾后一字节） */
  end: number;
}

export interface MalformedRegion {
  kind: 'unclosed_block' | 'duplicate_block' | 'bad_frontmatter';
  id?: string;
  detail: string;
}

export interface ParsedContractFile {
  hasFrontmatter: boolean;
  frontmatter: Record<string, unknown>;
  /** frontmatter 之后的原文（verbatim） */
  body: string;
  blocks: ManagedBlockSpan[];
  malformed: MalformedRegion[];
}

export interface ManagedBlockUpdate {
  id: string;
  content: string;
}

export type BlockDiffState = 'equal' | 'file_differs' | 'missing_in_file';

export interface BlockDiff {
  id: string;
  state: BlockDiffState;
  /** file_differs 时提供文件侧现值 */
  fileSide?: string;
}

export type Eol = '\r\n' | '\n';

@Injectable()
export class ContractEngineService {
  parse(raw: string): ParsedContractFile {
    const malformed: MalformedRegion[] = [];
    let hasFrontmatter = false;
    let frontmatter: Record<string, unknown> = {};
    let body = raw;
    let offset = 0;
    try {
      const parsed = matter(raw);
      frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
      hasFrontmatter = Object.keys(frontmatter).length > 0;
      body = parsed.content as string;
      offset = raw.length - body.length;
    } catch (err) {
      malformed.push({
        kind: 'bad_frontmatter',
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    const blocks: ManagedBlockSpan[] = [];
    const seenIds = new Set<string>();
    const beginAll = new RegExp(BEGIN_RE.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = beginAll.exec(body))) {
      const id = match[1];
      const innerStart = match.index + match[0].length;
      const rest = body.slice(innerStart);
      const endRe = new RegExp(`<!--\\s*END apm:managed:${id}\\s*-->`);
      const endMatch = endRe.exec(rest);
      beginAll.lastIndex = innerStart;
      if (!endMatch) {
        malformed.push({
          kind: 'unclosed_block',
          id,
          detail: `BEGIN apm:managed:${id} 缺少配对的 END 标记`,
        });
        continue;
      }
      if (seenIds.has(id)) {
        malformed.push({
          kind: 'duplicate_block',
          id,
          detail: `托管区间 ${id} 在文件中重复出现`,
        });
      }
      seenIds.add(id);
      blocks.push({
        id,
        inner: rest.slice(0, endMatch.index).trim(),
        start: offset + match.index,
        end: offset + innerStart + endMatch.index + endMatch[0].length,
      });
    }

    return { hasFrontmatter, frontmatter, body, blocks, malformed };
  }

  /**
   * 将 updates 应用到原文：已存在的区间原位替换，文件中缺失的区间按
   * appendMissing 追加到文件尾部（追加前文件尾部换行归一）。未涉及的
   * 区间与自由区字节保持不变。
   */
  applyManagedBlocks(
    raw: string,
    updates: ManagedBlockUpdate[],
    options: { appendMissing?: boolean } = {},
  ): string {
    if (updates.length === 0) return raw;
    for (const update of updates) {
      if (!MANAGED_BLOCK_ID_PATTERN.test(update.id)) {
        throw new Error(`非法托管区间 id: ${update.id}`);
      }
    }
    const eol = this.detectEol(raw);
    const parsed = this.parse(raw);
    const existing = new Map(parsed.blocks.map((b) => [b.id, b]));
    let out = raw;

    const replacements = parsed.blocks
      .filter((b) => updates.some((u) => u.id === b.id))
      .sort((a, b) => b.start - a.start);
    for (const span of replacements) {
      const update = updates.find((u) => u.id === span.id)!;
      out =
        out.slice(0, span.start) +
        this.buildManagedBlock(span.id, update.content, eol) +
        out.slice(span.end);
    }

    if (options.appendMissing) {
      const missing = updates.filter((u) => !existing.has(u.id));
      if (missing.length > 0) {
        const appended = missing
          .map((u) => this.buildManagedBlock(u.id, u.content, eol))
          .join(eol + eol);
        out = out.replace(/\r?\n+$/, '') + eol + eol + appended;
      }
    }
    return out;
  }

  buildManagedBlock(id: string, content: string, eol: Eol = '\n'): string {
    if (!MANAGED_BLOCK_ID_PATTERN.test(id)) {
      throw new Error(`非法托管区间 id: ${id}`);
    }
    const normalized = content
      .replace(/\r\n/g, '\n')
      .replace(/\n/g, eol)
      .replace(/\s+$/, '');
    return `<!-- BEGIN apm:managed:${id} -->${eol}${normalized}${eol}<!-- END apm:managed:${id} -->`;
  }

  /**
   * 写入 apm_ 命名空间的 frontmatter 字段：人工字段原样保留，apm_ 前缀
   * 字段整体由本入参替换。坏 frontmatter 的文件保守跳过（不重写）。
   */
  setApmFrontmatter(raw: string, apmFields: Record<string, unknown>): string {
    let parsed: { data: Record<string, unknown>; content: string };
    try {
      parsed = matter(raw);
    } catch {
      return raw;
    }
    const humanData: Record<string, unknown> = { ...parsed.data };
    for (const key of Object.keys(humanData)) {
      if (key.startsWith('apm_')) delete humanData[key];
    }
    const next = { ...humanData, ...apmFields };
    if (Object.keys(next).length === 0) return parsed.content;
    let out = matter.stringify(parsed.content, next);
    // gray-matter.stringify 会在 content 不以换行结尾时补一个尾换行，
    // 抵消该副作用以保证 frontmatter 之外的正文逐字节不变。
    if (!parsed.content.endsWith('\n')) {
      out = out.replace(/\n$/, '');
    }
    return out;
  }

  compareManagedBlocks(
    raw: string,
    expected: ManagedBlockUpdate[],
  ): BlockDiff[] {
    const parsed = this.parse(raw);
    const byId = new Map(parsed.blocks.map((b) => [b.id, b]));
    return expected.map((e) => {
      const span = byId.get(e.id);
      if (!span) return { id: e.id, state: 'missing_in_file' as const };
      const equal = span.inner.trim() === e.content.trim();
      return equal
        ? { id: e.id, state: 'equal' as const }
        : { id: e.id, state: 'file_differs' as const, fileSide: span.inner };
    });
  }

  detectEol(raw: string): Eol {
    const crlf = (raw.match(/\r\n/g) ?? []).length;
    const loneLf = (raw.match(/\n/g) ?? []).length - crlf;
    return crlf > loneLf ? '\r\n' : '\n';
  }

  checksum(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }
}
