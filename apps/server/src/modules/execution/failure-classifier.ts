/**
 * 执行失败机械归类（批一 P0 切片 3，2026-09-17 裁决 D 的零 token 半）。
 *
 * 对失败/阻塞执行的错误留痕做关键词归类（环境/输入/依赖/未知四类），
 * 供失败通知与执行详情即时给出「为什么失败」的第一层解释——重试若只是
 * 同输入再跑一次对用户没有增加理解。深度诊断归 failure-diagnosis 静默
 * 场景（按需 LLM，AIUsageLog 记账），本文件绝不发网络请求。
 *
 * 纯函数：输入是执行行的 errorDetail / input（含 dispatchError 与
 * retryContext 血缘留痕），无 IO、无 prisma 依赖，前端渲染直接消费
 * 服务端算好的字段，不复制规则。
 */

export type ExecutionFailureCategory =
  'environment' | 'input' | 'dependency' | 'unknown';

export interface ExecutionFailureClassification {
  category: ExecutionFailureCategory;
  /** 一句话人话解释：面向非专业用户说「出了什么事」，不说术语 */
  hint: string;
}

/** 规则按序首个命中生效：依赖（自家门禁文案）→ 环境 → 输入 → 未知 */
const CATEGORY_RULES: Array<{
  category: ExecutionFailureCategory;
  keywords: string[];
  hint: string;
}> = [
  {
    category: 'dependency',
    keywords: ['blocks 依赖', '循环依赖', '未完成的 blocks'],
    hint: '该任务的前置依赖还没有完成，需要先完成依赖的任务再执行',
  },
  {
    category: 'environment',
    keywords: [
      'enoent',
      'eacces',
      'econnrefused',
      'etimedout',
      'enospc',
      'spawn ',
      'command not found',
      'not a git repository',
      'permission denied',
      'eaddrinuse',
    ],
    hint: '运行环境出了问题（常见：命令或文件不存在、权限不足、网络/端口不通），通常与任务内容本身无关',
  },
  {
    category: 'input',
    keywords: [
      'invalid',
      'required',
      'json',
      'parse',
      'schema',
      '校验',
      '参数',
      'must be',
      'unexpected',
    ],
    hint: '执行输入可能不完整或格式不对，建议检查任务描述与输入后调整重试',
  },
];

const UNKNOWN_HINT =
  '暂未能从错误信息自动判断原因，可在执行详情点「AI 诊断」做深入分析，或请有工程经验的同事协助查看';

/** 从错误留痕各处收集可疑文本（errorDetail + input.dispatchError + 血缘留痕） */
function collectErrorTexts(source: {
  errorDetail?: unknown;
  input?: unknown;
}): string[] {
  const texts: string[] = [];
  const { errorDetail, input } = source;
  if (typeof errorDetail === 'string') {
    texts.push(errorDetail);
  } else if (errorDetail && typeof errorDetail === 'object') {
    texts.push(JSON.stringify(errorDetail));
  }
  if (input && typeof input === 'object') {
    const bag = input as Record<string, unknown>;
    if (typeof bag.dispatchError === 'string') texts.push(bag.dispatchError);
    const retryContext = bag.retryContext;
    if (retryContext && typeof retryContext === 'object') {
      const rc = retryContext as Record<string, unknown>;
      if (typeof rc.originalError === 'string') texts.push(rc.originalError);
      if (typeof rc.originalDispatchError === 'string') {
        texts.push(rc.originalDispatchError);
      }
    }
  }
  return texts;
}

/**
 * 归类失败执行。无任何错误留痕文本时返回 null（无信号，不猜）；
 * 有文本但无关键词命中时归 unknown（给「下一步怎么办」而不是空白）。
 */
export function classifyExecutionFailure(
  source: { errorDetail?: unknown; input?: unknown } | null | undefined,
): ExecutionFailureClassification | null {
  if (!source) return null;
  const haystack = collectErrorTexts(source).join('\n').toLowerCase();
  if (!haystack) return null;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) {
      return { category: rule.category, hint: rule.hint };
    }
  }
  return { category: 'unknown', hint: UNKNOWN_HINT };
}
