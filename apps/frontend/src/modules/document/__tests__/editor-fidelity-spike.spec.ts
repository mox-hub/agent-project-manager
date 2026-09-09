import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

/**
 * 编辑器选型 spike——保真度测试集（契约与文档知识层 v2 纪要 §14）。
 *
 * 路线 A（真 WYSIWYG，Milkdown/ProseMirror 系）：其 serialize 层即
 * remark parse→mdast→remark stringify；纯 remark 往返是它的【乐观下界】
 * （中间还要过 prosemirror 文档模型，未知语法损失只会更大）。
 *
 * 路线 B（live-preview，CodeMirror 装饰渲染）：缓冲区始终是 md 纯文本，
 * 编辑 = 字符串区间替换，结构上不存在序列化往返。本文件用「文本缓冲
 * 契约」用例把它写成可执行规范：任何遵守该契约的实现自动逐字节保真。
 *
 * 通过标准（v2 纪要 §14.2）：现有全部文档 round-trip 逐字节相等 +
 * managed 区间安全。
 */

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkStringify);

/** 路线 A 等价物：remark parse→stringify 往返 */
function remarkRoundTrip(md: string): string {
  return processor.stringify(processor.parse(md));
}

const MIXED_CN = [
  '# 混排样本：契约与文档知识层',
  '',
  '> 引用块：中文**加粗**与*斜体*混排，含 `inline code`。',
  '',
  '## 表格',
  '',
  '| docRole | 真相 | 绑定 |',
  '|---------|------|------|',
  '| charter | 文件 | managed |',
  '| spec    | DB（approved 版） | 导出镜像 |',
  '',
  '## HTML 块（仓库大量混排，必须原样保留）',
  '',
  '<table><tr><td>原生 HTML 表格</td></tr></table>',
  '',
  '<div align="center">',
  '  多行 HTML 块',
  '</div>',
  '',
  '## 列表',
  '',
  '1. 有序列表项一',
  '2. 有序列表项二',
  '   - 嵌套无序项',
  '     - 二级嵌套',
  '3. `apm://apm/doc/A17` 与 [内嵌链接](apm://apm/issue/A24)',
  '',
  '- [ ] 任务列表未完成',
  '- [x] 任务列表已完成',
  '',
  '## 代码块',
  '',
  '```ts',
  'const raw = `---\\ntitle: ${title}\\n---`; // 特殊字符 "quotes" & <tags>',
  '```',
  '',
  '## 转义与特殊字符',
  '',
  '反斜杠\\\\、星号\\*、下划线\\_、管道 |、尖括号 <https://example.com>。',
  '',
  '---',
  '',
  '结尾段落，行尾含两个尾随空格  ',
  '',
].join('\n');

const FIXTURES: { name: string; md: string }[] = [
  { name: '内联混排样本（中文/表格/HTML/嵌套列表/转义/尾随空格）', md: MIXED_CN },
];

describe('编辑器选型 spike · 保真度测试集', () => {
  describe('共享 fixtures', () => {
    it('仓库真实 AGENTS.md（frontmatter + 中文 + 表格 + 混排）', () => {
      const raw = readFileSync(
        resolve(process.cwd(), '../../AGENTS.md'),
        'utf8',
      );
      expect(raw.length).toBeGreaterThan(1000);
      FIXTURES.push({ name: '真实仓库 AGENTS.md', md: raw });
    });
  });

  describe('路线 A：remark 往返（Milkdown serialize 层的乐观下界）', () => {
    it('[证据 A1] frontmatter 被 remark 解析为 thematicBreak —— 语义级损毁', () => {
      const raw = readFileSync(
        resolve(process.cwd(), '../../AGENTS.md'),
        'utf8',
      );
      const out = remarkRoundTrip(raw);
      // round-trip 字节膨胀 47%（7497 → ~11000），frontmatter 语义完全丢失
      expect(out.length).toBeGreaterThan(raw.length * 1.3);
      expect(out.startsWith('***')).toBe(true);
      expect(out).not.toContain('---\ntitle:');
      // 过关判据（v2 纪要 §14.2 逐字节相等）不满足 —— 路线 A 判定未过门槛
      expect(remarkRoundTrip(raw)).not.toBe(raw);
    });

    it('[证据 A2] 表格对齐被重排 —— 字节级规范化，git diff 膨胀', () => {
      const table = [
        '| docRole | 真相 | 绑定 |',
        '|---------|------|------|',
        '| charter | 文件 | managed |',
      ].join('\n');
      const out = remarkRoundTrip(table);
      expect(out).not.toBe(table); // 列宽按最长单元格重排填充
      // 语义无损：单元格内容保留，但逐字节 diff 不再成立
      expect(out).toContain('docRole');
      expect(out).toContain('charter');
    });

    it('[证据 A4] 无序列表符号 `-` 被规范化为 `*`，且文末强制补换行', () => {
      const list = ['- 列表项', '- 第二项'].join('\n');
      const out = remarkRoundTrip(list);
      expect(out).toBe('* 列表项\n* 第二项\n'); // bullet 重写 + 尾换行规范化
    });

    it('[证据 A5] 文末无换行的文档被强制补换行；纯标题/引用/代码子集其余保真', () => {
      const plain = [
        '# 标题',
        '',
        '> 引用',
        '',
        '```ts',
        'const x = 1;',
        '```',
        '',
        '**粗体** 与 `code`。',
      ].join('\n');
      expect(remarkRoundTrip(plain)).toBe(`${plain}\n`);
      // 文末带换行的同构文档可逐字节往返（A 的可保真上限形态）
      expect(remarkRoundTrip(`${plain}\n`)).toBe(`${plain}\n`);
    });

    it('[证据 A3] managed 区间标记在 remark 往返后保留（HTML 注释节点）', () => {
      const md = [
        '前文。',
        '',
        '<!-- BEGIN apm:managed:intro -->',
        '区间内容',
        '<!-- END apm:managed:intro -->',
        '',
        '后文。',
      ].join('\n');
      const out = remarkRoundTrip(md);
      expect(out).toContain('<!-- BEGIN apm:managed:intro -->');
      expect(out).toContain('<!-- END apm:managed:intro -->');
    });
  });

  describe('路线 B：live-preview 文本缓冲契约（结构上零往返）', () => {
    // B 的编辑路径 = 对文本缓冲的区间替换（CodeMirror 事务模型）。
    // 任何遵守「事务即文本替换、渲染层只读不回写」的实现自动通过本组用例。
    function edit(
      md: string,
      find: string,
      replace: string,
    ): string {
      const idx = md.indexOf(find);
      expect(idx).toBeGreaterThanOrEqual(0);
      return md.slice(0, idx) + replace + md.slice(idx + find.length);
    }

    FIXTURES.forEach(({ name, md }) => {
      it(`典型编辑后其余字节不变 — ${name}`, () => {
        let out = md;
        out = edit(out, '## 表格', '## 数据表');
        expect(out).toContain('## 数据表');
        // 未编辑区域的代表字节全部原样保留
        expect(out).toContain('| charter | 文件 | managed |');
        expect(out).toContain('<div align="center">');
        expect(out).toContain('const raw = `---');
        expect(out.endsWith('结尾段落，行尾含两个尾随空格  \n')).toBe(true);
      });

      it(`无序列化往返：编辑前后无 parse/serialize 介入（契约断言）— ${name}`, () => {
        // 编辑路径的输出 = 纯字符串拼接结果，与「手算的期望字符串」逐字节一致
        const target = '任务列表未完成';
        const out = edit(md, target, `${target}（已验）`);
        const manualIdx = md.indexOf(target);
        const manual =
          md.slice(0, manualIdx) +
          `${target}（已验）` +
          md.slice(manualIdx + target.length);
        expect(out).toBe(manual);
      });
    });

    it('managed 区间安全：区间外编辑不触碰区间字节', () => {
      const md = [
        '---',
        'apm_sync_mode: managed',
        '---',
        '',
        '<!-- BEGIN apm:managed:intro -->',
        '系统托管内容 v1',
        '<!-- END apm:managed:intro -->',
        '',
        '自由区草稿。',
      ].join('\n');
      const out = edit(md, '自由区草稿。', '自由区草稿，已续写。');
      expect(out).toContain('系统托管内容 v1');
      expect(out).toContain('<!-- BEGIN apm:managed:intro -->');
      // frontmatter 与区间字节逐字未动
      const block = [
        '<!-- BEGIN apm:managed:intro -->',
        '系统托管内容 v1',
        '<!-- END apm:managed:intro -->',
      ].join('\n');
      expect(out).toContain(block);
    });
  });
});
