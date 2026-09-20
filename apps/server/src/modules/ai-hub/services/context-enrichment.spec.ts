import {
  buildEnrichmentSection,
  estimateTokens,
  readBudgetFromEnv,
  type EnrichmentSource,
} from './context-enrichment';

describe('estimateTokens（字符/4 粗估）', () => {
  it('空串为 0', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('4 字符 ≈ 1 token，不足 4 字符向上取整', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('a'.repeat(401))).toBe(101);
  });
});

describe('readBudgetFromEnv（预算配置读取）', () => {
  const KEY = 'TEST_ENRICHMENT_BUDGET_SPEC';

  it('未设置时回退缺省值', () => {
    expect(readBudgetFromEnv(KEY, 1234)).toBe(1234);
  });

  it('合法正值生效', () => {
    process.env[KEY] = '500';
    expect(readBudgetFromEnv(KEY, 1234)).toBe(500);
    delete process.env[KEY];
  });

  it('非法/非正值回退缺省值', () => {
    process.env[KEY] = 'abc';
    expect(readBudgetFromEnv(KEY, 1234)).toBe(1234);
    process.env[KEY] = '-5';
    expect(readBudgetFromEnv(KEY, 1234)).toBe(1234);
    delete process.env[KEY];
  });
});

describe('buildEnrichmentSection（贪心装入 + 截断标注）', () => {
  const makeSource = (
    key: string,
    title: string,
    text: string,
    priority: number,
  ): EnrichmentSource => ({ key, title, text, priority });

  it('预算充足：全装入，无 truncated', () => {
    const result = buildEnrichmentSection(
      [
        makeSource('docs', '## 文档', '短文档内容', 1),
        makeSource('memories', '## 记忆', '短记忆内容', 2),
      ],
      1000,
    );
    expect(result.included).toEqual(['docs', 'memories']);
    expect(result.truncated).toEqual([]);
    expect(result.text).toContain('## 文档');
    expect(result.text).toContain('## 记忆');
    expect(result.text).not.toContain('截断');
  });

  it('空正文来源被过滤：不注入空段', () => {
    const result = buildEnrichmentSection(
      [
        makeSource('docs', '## 文档', '', 1),
        makeSource('memories', '## 记忆', '   \n  ', 2),
      ],
      1000,
    );
    expect(result.included).toEqual([]);
    expect(result.text).toBe('');
  });

  it('预算不足：低优先级段截断并在 truncated 标注（不静默）', () => {
    // 高优先级段占 100 字符 ≈ 25 token；总预算 40，低优先级段只能装下一部分
    const longText = 'b'.repeat(400); // ≈ 100 token
    const result = buildEnrichmentSection(
      [
        makeSource('docs', '## 文档', 'a'.repeat(100), 1),
        makeSource('memories', '## 记忆', longText, 2),
      ],
      40,
    );
    expect(result.included).toContain('docs');
    expect(result.truncated).toContain('memories');
    expect(result.text).toContain('（注：记忆已按 token 预算截断）');
    expect(result.text).toContain('已按 token 预算截断');
  });

  it('预算耗尽：低优先级段整段丢弃并标 truncated', () => {
    const result = buildEnrichmentSection(
      [
        makeSource('docs', '## 文档', 'a'.repeat(400), 1), // 块 ≈ 102 token
        makeSource('memories', '## 记忆', 'b'.repeat(400), 2),
      ],
      104, // docs 装完后只剩 2 token ≈ 标题行，正文无预算 → 整段丢弃
    );
    expect(result.included).toEqual(['docs']);
    expect(result.truncated).toEqual(['memories']);
    expect(result.text).not.toContain('bbbb');
  });

  it('装入顺序按 priority 升序，与传入顺序无关', () => {
    const result = buildEnrichmentSection(
      [
        makeSource('low', '## 低', '低内容', 3),
        makeSource('high', '## 高', '高内容', 1),
      ],
      1000,
    );
    expect(result.included).toEqual(['high', 'low']);
    expect(result.text.indexOf('## 高')).toBeLessThan(
      result.text.indexOf('## 低'),
    );
  });

  it('usedTokens 汇总各装入块', () => {
    const result = buildEnrichmentSection(
      [makeSource('docs', '## 文档', 'a'.repeat(40), 1)],
      1000,
    );
    expect(result.usedTokens).toBeGreaterThan(0);
    expect(result.usedTokens).toBeLessThanOrEqual(1000);
  });
});
