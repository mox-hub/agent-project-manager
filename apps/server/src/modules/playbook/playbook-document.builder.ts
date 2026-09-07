/**
 * 访谈 → 正式工件的结构化转写器（v2 纪要 §2.4「对照翻译，不是名词解释」）。
 * 确定性模板拼接，不调模型：用户原话保留为引用块，专业转写为要点，
 * 术语对照逐条标注（人话 → 术语 → 落在本文哪节），文档末尾汇总对照表。
 * 这是「人只供决策」的最小可行形态：用户亲眼看到自己的话如何变成专业工件。
 */

import type { PlaybookStage } from './playbook.registry';

export interface InterviewAnswer {
  questionId: string;
  answer: string;
}

export interface GlossaryMapping {
  questionId: string;
  question: string;
  answerExcerpt: string;
  term?: string;
  termNote?: string;
}

export interface InterviewDocument {
  title: string;
  content: string;
  mappings: GlossaryMapping[];
}

/** 摘要截断：原话引用保留首行，避免文档被长答案撑爆 */
function excerpt(text: string, max = 60): string {
  const firstLine = text.trim().split('\n')[0] ?? '';
  return firstLine.length > max ? `${firstLine.slice(0, max)}…` : firstLine;
}

/** 把多行答案拆成要点（一行一要点；单行按句号拆） */
function toBullets(answer: string): string[] {
  const lines = answer
    .split('\n')
    .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
  if (lines.length > 1) return lines;
  return (lines[0] ?? '')
    .split(/[。；;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildInterviewDocument(params: {
  projectName: string;
  stage: PlaybookStage;
  answers: InterviewAnswer[];
}): InterviewDocument {
  const { projectName, stage, answers } = params;
  const byId = new Map(answers.map((a) => [a.questionId, a.answer.trim()]));
  const title = stage.document.titleTemplate.replace('{project}', projectName);

  const mappings: GlossaryMapping[] = [];
  const summaryLines: string[] = [];
  const detailSections: string[] = [];
  const glossaryRows: string[] = [];

  stage.interview.forEach((q, idx) => {
    const answer = byId.get(q.id) ?? '';
    const no = idx + 1;
    const heading = q.term ?? q.question;
    detailSections.push(
      [
        `### ${no}. ${q.question}`,
        answer ? `> 你的原话：${excerpt(answer, 120)}` : '> （未回答）',
        '',
        ...(answer
          ? toBullets(answer).map((b) => `- ${b}`)
          : ['- 本条留空，闸门前可驳回补充。']),
        '',
        ...(q.term && answer
          ? [
              `【人话对照】你说的「${excerpt(answer)}」对应专业概念 **${q.term}**${
                q.termNote ? `——${q.termNote}` : ''
              }`,
              '',
            ]
          : []),
      ].join('\n'),
    );
    if (answer) {
      summaryLines.push(
        stage.document.numbered
          ? `- FR-${summaryLines.length + 1}（${heading}）：${excerpt(answer, 80)}`
          : `- **${heading}**：${excerpt(answer, 80)}`,
      );
    }
    if (q.term) {
      mappings.push({
        questionId: q.id,
        question: q.question,
        answerExcerpt: excerpt(answer),
        term: q.term,
        termNote: q.termNote,
      });
      if (answer) {
        glossaryRows.push(
          `| ${excerpt(answer)} | ${q.term} | ${excerpt(q.termNote ?? '', 40)} |`,
        );
      }
    }
  });

  const content = [
    stage.document.intro,
    '',
    '## 结论摘要',
    summaryLines.length > 0
      ? summaryLines.join('\n')
      : '（本次访谈无有效回答）',
    '',
    '## 详细记录',
    ...detailSections,
    ...(glossaryRows.length > 0
      ? [
          '## 术语对照表',
          '',
          '| 你说的 | 专业术语 | 说明 |',
          '| --- | --- | --- |',
          ...glossaryRows,
          '',
        ]
      : []),
    '---',
    '本文由访谈回答结构化转写生成（对照翻译 v0）；有偏差处请在闸门驳回时说明。',
  ].join('\n');

  return { title, content, mappings };
}
