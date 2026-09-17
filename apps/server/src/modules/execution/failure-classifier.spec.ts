import {
  classifyExecutionFailure,
  type ExecutionFailureClassification,
} from './failure-classifier';

/**
 * 执行失败机械归类单测（批一 P0 切片 3，裁决 D 零 token 半）：
 * 纯函数关键词归类（依赖/环境/输入/未知四类），无错误留痕返回 null 不猜。
 */
describe('classifyExecutionFailure', () => {
  const classifyText = (text: string): ExecutionFailureClassification | null =>
    classifyExecutionFailure({ errorDetail: text });

  it('无错误留痕时返回 null（无信号不猜）', () => {
    expect(classifyExecutionFailure(null)).toBeNull();
    expect(classifyExecutionFailure({})).toBeNull();
    expect(
      classifyExecutionFailure({ errorDetail: null, input: {} }),
    ).toBeNull();
  });

  it('依赖门禁文案归 dependency', () => {
    const result = classifyText(
      '该工单存在未完成的 blocks 依赖，暂不可派发执行：「前置任务」（状态：in_progress）',
    );
    expect(result?.category).toBe('dependency');
  });

  it('循环依赖拒绝文案归 dependency', () => {
    expect(classifyText('不能建立该依赖：会形成循环依赖')?.category).toBe(
      'dependency',
    );
  });

  it.each([
    ['spawn node ENOENT', '环境'],
    ['fatal: not a git repository', '环境'],
    ['ECONNREFUSED 127.0.0.1:4300', '环境'],
    ['error: permission denied while running command', '环境'],
  ])('环境类错误「%s」归 environment', (text) => {
    expect(classifyText(text)?.category).toBe('environment');
  });

  it.each([
    ['Unexpected token } in JSON', '输入'],
    ['property "goal" is required', '输入'],
    ['参数校验失败：title 不能为空', '输入'],
  ])('输入类错误「%s」归 input', (text) => {
    expect(classifyText(text)?.category).toBe('input');
  });

  it('无关键词命中但有错误文本时归 unknown 并给下一步', () => {
    const result = classifyText('Process exited with code 137');
    expect(result?.category).toBe('unknown');
    expect(result?.hint).toContain('AI 诊断');
  });

  it('从 input.dispatchError 与 retryContext 血缘留痕取文本', () => {
    const result = classifyExecutionFailure({
      errorDetail: null,
      input: {
        dispatchError: 'spawn claude-code ENOENT',
        retryContext: {
          originalDispatchError: 'provider not available',
        },
      },
    });
    // dispatchError 命中环境类（spawn/ENOENT）
    expect(result?.category).toBe('environment');
  });

  it('规则按序首个命中生效：依赖优先于环境关键词', () => {
    const result = classifyText('blocks 依赖未完成（附带 ECONNREFUSED 字样）');
    expect(result?.category).toBe('dependency');
  });
});
