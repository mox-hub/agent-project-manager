import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ContractEngineService } from '../contract-engine.service';

/**
 * 区间引擎幂等测试集（v2 纪要 §5.2 出口标准）：
 * 未涉及的托管区间与自由区在任何写入操作中逐字节不变；
 * parse 对真实混排文档零破坏。
 */

describe('ContractEngineService', () => {
  let engine: ContractEngineService;

  beforeEach(() => {
    engine = new ContractEngineService();
  });

  describe('parse', () => {
    it('纯自由区文件（无 frontmatter / 无区间）：零畸形', () => {
      const raw = '# 标题\n\n正文段落。\n\n| a | b |\n|---|---|\n| 1 | 2 |\n';
      const parsed = engine.parse(raw);
      expect(parsed.hasFrontmatter).toBe(false);
      expect(parsed.blocks).toEqual([]);
      expect(parsed.malformed).toEqual([]);
      expect(parsed.body).toBe(raw);
    });

    it('提取托管区间：inner 不含标记行与首尾空白', () => {
      const raw = [
        '前文自由区。',
        '',
        '<!-- BEGIN apm:managed:intro -->',
        '区间内容',
        '<!-- END apm:managed:intro -->',
        '',
        '后文自由区。',
        '',
      ].join('\n');
      const parsed = engine.parse(raw);
      expect(parsed.malformed).toEqual([]);
      expect(parsed.blocks).toHaveLength(1);
      expect(parsed.blocks[0].id).toBe('intro');
      expect(parsed.blocks[0].inner).toBe('区间内容');
    });

    it('未闭合区间报 malformed 且不产出 span', () => {
      const raw = '<!-- BEGIN apm:managed:ghost -->\n内容\n';
      const parsed = engine.parse(raw);
      expect(parsed.blocks).toEqual([]);
      expect(parsed.malformed).toHaveLength(1);
      expect(parsed.malformed[0]).toMatchObject({
        kind: 'unclosed_block',
        id: 'ghost',
      });
    });

    it('重复 id 报 malformed', () => {
      const block = (extra: string) =>
        `<!-- BEGIN apm:managed:dup -->${extra}<!-- END apm:managed:dup -->`;
      const parsed = engine.parse(`${block('a')}\n${block('b')}`);
      expect(parsed.blocks).toHaveLength(2);
      expect(parsed.malformed).toHaveLength(1);
      expect(parsed.malformed[0]).toMatchObject({ kind: 'duplicate_block' });
    });

    it('坏 YAML frontmatter 报 malformed 而不抛异常', () => {
      const raw = '---\ntitle: [未闭合\n---\n\n正文\n';
      const parsed = engine.parse(raw);
      expect(parsed.malformed).toHaveLength(1);
      expect(parsed.malformed[0].kind).toBe('bad_frontmatter');
    });

    it('解析真实仓库根 AGENTS.md（frontmatter + 中文 + 混排）：零畸形', () => {
      const raw = readFileSync(
        resolve(process.cwd(), '../../AGENTS.md'),
        'utf8',
      );
      const parsed = engine.parse(raw);
      expect(parsed.malformed).toEqual([]);
      expect(parsed.hasFrontmatter).toBe(true);
      expect(parsed.frontmatter['title']).toBe(
        'AGENTS.md - 跨工具 AI 会话入口',
      );
      // frontmatter 之后的 body 与原文去除 frontmatter 后逐字节一致
      expect(raw.endsWith(parsed.body)).toBe(true);
    });
  });

  describe('applyManagedBlocks', () => {
    const fixture = [
      '---',
      'title: 示例',
      'category: guide',
      '---',
      '',
      '# 文档',
      '',
      '<!-- BEGIN apm:managed:intro -->',
      '旧简介',
      '<!-- END apm:managed:intro -->',
      '',
      '| 列 | 表 |',
      '|---|---|',
      '| a | b |',
      '',
      '<!-- BEGIN apm:managed:other -->',
      '其他区间',
      '<!-- END apm:managed:other -->',
      '',
      '尾部自由段落。',
      '',
    ].join('\n');

    it('空 updates：原样返回（引用都不换）', () => {
      expect(engine.applyManagedBlocks(fixture, [])).toBe(fixture);
    });

    it('替换区间：其余区间与自由区逐字节不变', () => {
      const out = engine.applyManagedBlocks(fixture, [
        { id: 'intro', content: '新简介' },
      ]);
      // 其他区间字节不变
      expect(out).toContain('<!-- BEGIN apm:managed:other -->');
      // 自由区字节不变（frontmatter、标题、表格、尾部段落）
      expect(out).toContain('title: 示例');
      expect(out).toContain('# 文档');
      expect(out).toContain('| a | b |');
      expect(out).toContain('尾部自由段落。');
      expect(out).toContain('新简介');
      expect(out).not.toContain('旧简介');
      // 再 parse：无畸形、区间值正确
      const reparsed = engine.parse(out);
      expect(reparsed.malformed).toEqual([]);
      const intro = reparsed.blocks.find((b) => b.id === 'intro');
      expect(intro?.inner).toBe('新简介');
    });

    it('appendMissing：原文件内容是输出的前缀（除尾部换行归一）', () => {
      const trimmed = fixture.replace(/\n+$/, '');
      const out = engine.applyManagedBlocks(
        fixture,
        [{ id: 'new-block', content: '新增区间' }],
        { appendMissing: true },
      );
      expect(out.startsWith(trimmed)).toBe(true);
      expect(out).toContain('<!-- BEGIN apm:managed:new-block -->');
    });

    it('CRLF 文件：替换区间生成 CRLF，未碰字节保持 CRLF', () => {
      const crlfFixture = fixture.replace(/\n/g, '\r\n');
      const out = engine.applyManagedBlocks(crlfFixture, [
        { id: 'intro', content: '换行替换' },
      ]);
      expect(engine.detectEol(out)).toBe('\r\n');
      expect(out).toContain('<!-- BEGIN apm:managed:intro -->\r\n');
      const parsed = engine.parse(out);
      expect(parsed.malformed).toEqual([]);
      const intro = parsed.blocks.find((b) => b.id === 'intro');
      expect(intro?.inner).toBe('换行替换');
    });

    it('未闭合区间不被写操作触碰', () => {
      const raw = 'A\n<!-- BEGIN apm:managed:ghost -->\n内容\nB';
      const out = engine.applyManagedBlocks(raw, [
        { id: 'ghost', content: '不应写入' },
      ]);
      expect(out).toBe(raw);
    });

    it('非法区间 id 抛错', () => {
      expect(() =>
        engine.applyManagedBlocks('x', [{ id: 'bad id;}', content: 'v' }]),
      ).toThrow();
      expect(() => engine.buildManagedBlock('bad/id', 'v')).toThrow();
    });
  });

  describe('setApmFrontmatter', () => {
    const raw = [
      '---',
      'title: 手工文档',
      'tags: [a, b]',
      'apm_sync_mode: managed',
      '---',
      '',
      '# 正文',
      '',
      '自由区段落。',
    ].join('\n');

    it('apm_ 字段被替换、人工字段保留、正文逐字节保留', () => {
      const out = engine.setApmFrontmatter(raw, {
        apm_project_id: 'proj-1',
        apm_file_type: 'agents',
        apm_sync_mode: 'managed',
      });
      const parsed = engine.parse(out);
      expect(parsed.malformed).toEqual([]);
      expect(parsed.frontmatter['title']).toBe('手工文档');
      expect(parsed.frontmatter['apm_project_id']).toBe('proj-1');
      expect(parsed.frontmatter['apm_file_type']).toBe('agents');
      expect(parsed.body.endsWith('自由区段落。')).toBe(true);
    });

    it('同一入参重复写入幂等（字节相等）', () => {
      const once = engine.setApmFrontmatter(raw, { apm_project_id: 'p1' });
      const twice = engine.setApmFrontmatter(once, { apm_project_id: 'p1' });
      expect(twice).toBe(once);
    });

    it('无 frontmatter 文件安全跳过坏 YAML（原样返回）', () => {
      const bad = '---\ntitle: [坏\n---\n正文';
      expect(engine.setApmFrontmatter(bad, { apm_x: 1 })).toBe(bad);
    });
  });

  describe('compareManagedBlocks', () => {
    const raw = [
      '<!-- BEGIN apm:managed:equal-block -->',
      '一致内容',
      '<!-- END apm:managed:equal-block -->',
      '',
      '<!-- BEGIN apm:managed:drift-block -->',
      '文件侧被手改',
      '<!-- END apm:managed:drift-block -->',
    ].join('\n');

    it('三态：equal / file_differs / missing_in_file', () => {
      const diffs = engine.compareManagedBlocks(raw, [
        { id: 'equal-block', content: '一致内容' },
        { id: 'drift-block', content: '数据库侧真相' },
        { id: 'absent-block', content: '文件里没有' },
      ]);
      expect(diffs).toEqual([
        { id: 'equal-block', state: 'equal' },
        {
          id: 'drift-block',
          state: 'file_differs',
          fileSide: '文件侧被手改',
        },
        { id: 'absent-block', state: 'missing_in_file' },
      ]);
    });
  });
});
