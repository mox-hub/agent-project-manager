/**
 * grill 需求澄清纪要生成（CAP-P-01）：摘要 → markdown 全文。
 * 创建面板确认建项时落为「需求澄清纪要」文档，grill 产出持久化不丢。
 */

export interface GrillSummaryState {
  name?: string;
  description?: string;
  goals?: string[];
  users?: string[];
  scope?: string[];
  nonGoals?: string[];
  constraints?: string[];
  acceptanceHints?: string[];
}

export function buildGrillMinutes(summary: GrillSummaryState): string {
  const lines: string[] = [
    `# 需求澄清纪要 · ${summary.name ?? ''}`,
    '',
  ];
  if (summary.description) lines.push(`${summary.description}`, '');
  const sections: Array<[string, string[] | undefined]> = [
    ['要达成的结果', summary.goals],
    ['给谁用', summary.users],
    ['这一期做什么', summary.scope],
    ['明确不做什么', summary.nonGoals],
    ['约束', summary.constraints],
    ['怎么算做完（线索）', summary.acceptanceHints],
  ];
  for (const [title, items] of sections) {
    if (items && items.length > 0) {
      lines.push(`## ${title}`, ...items.map((s) => `- ${s}`), '');
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}
