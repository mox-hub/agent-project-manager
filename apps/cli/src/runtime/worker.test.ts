/**
 * Worker 执行循环单测：注入假 ApmClient 与假适配器，runCliProcess 打桩
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';import type { ChildProcess } from 'child_process';
import {
  ApmClient,
  CliAdapter,
  RUNTIME_ENDPOINTS,
  RuntimeDispatch,
  RunnerCallbacks,
} from '@apm/shared';

vi.mock('@apm/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apm/shared')>();
  return {
    ...actual,
    runCliProcess: vi.fn(),
  };
});

import { runCliProcess } from '@apm/shared';
import { startWorker } from './worker';

const mockRun = vi.mocked(runCliProcess);

function makeApi(approvalId?: string): ApmClient {
  return {
    post: vi.fn().mockResolvedValue(
      approvalId ? { approvalRequestId: approvalId } : {},
    ),
    get: vi.fn().mockResolvedValue([]),
  } as unknown as ApmClient;
}

const dispatch: RuntimeDispatch = {
  executionRunId: 'run-1',
  providerId: 'claude-code',
  prompt: '做点事',
  workspaceRoot: '/tmp/ws',
};

function fakeAdapter(): CliAdapter {
  return {
    getProviderId: () => 'claude-code',
    detect: async () => ({ available: true }),
    buildCommand: () => ({ cmd: 'fake', args: [], env: {} }),
    parseStream: () => {},
    parseFinalResult: () => ({ status: 'completed', artifacts: [] }),
  };
}

function fakeProc(): ChildProcess {
  return { pid: 1234, kill: vi.fn() } as unknown as ChildProcess;
}

function neverPromise<T>(): Promise<T> {
  return new Promise(() => {});
}

beforeEach(() => {
  mockRun.mockReset();
});

describe('runtime worker', () => {
  it('执行载荷缺失时上报 failed', async () => {
    const api = makeApi();
    const w = startWorker(api, 'rt-1');
    await w.handleDispatch({ executionRunId: 'run-x' });
    expect(api.post).toHaveBeenCalledWith(
      RUNTIME_ENDPOINTS.executionResult('run-x'),
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('同一 executionRunId 去重，只执行一次', async () => {
    const api = makeApi();
    const w = startWorker(api, 'rt-1', { 'claude-code': fakeAdapter() });
    mockRun.mockReturnValue({ proc: fakeProc(), promise: neverPromise() });
    // handleDispatch 会 await 执行全程，不等待其完成，只等任务注册
    void w.handleDispatch(dispatch);
    await vi.waitFor(() => expect(w.running()).toBe(1));
    await w.handleDispatch(dispatch);
    expect(mockRun).toHaveBeenCalledTimes(1);
    expect(w.running()).toBe(1);
  });

  it('执行完成后上报结果并映射 artifacts', async () => {
    const api = makeApi();
    const w = startWorker(api, 'rt-1', { 'claude-code': fakeAdapter() });
    mockRun.mockReturnValue({
      proc: fakeProc(),
      promise: Promise.resolve({
        status: 'completed',
        stdout: '',
        stderr: '',
        parse: {
          status: 'completed' as const,
          artifacts: [{ type: 'result', name: 'summary', storageRef: 'ref-1' }],
        },
      }),
    });
    await w.handleDispatch(dispatch);
    expect(api.post).toHaveBeenCalledWith(
      RUNTIME_ENDPOINTS.executionResult('run-1'),
      expect.objectContaining({
        status: 'completed',
        artifacts: [{ type: 'result', ref: 'ref-1' }],
      }),
    );
    expect(w.running()).toBe(0);
  });

  it('审批请求注册映射；驳回决议命中并上报事件，未知 id 返回 false', async () => {
    const api = makeApi('apr_1');
    const w = startWorker(api, 'rt-1', { 'claude-code': fakeAdapter() });
    let onApprovalNeeded: RunnerCallbacks['onApprovalNeeded'] | undefined;
    mockRun.mockImplementation((_adapter, _input, callbacks) => {
      onApprovalNeeded = callbacks.onApprovalNeeded;
      return { proc: fakeProc(), promise: neverPromise() };
    });
    void w.handleDispatch(dispatch);
    await vi.waitFor(() => expect(mockRun).toHaveBeenCalledTimes(1));

    onApprovalNeeded?.({
      requestedAction: '删除文件',
      actionType: 'tool_call',
      riskLevel: 'write',
    });
    // onApprovalNeeded 内部 post 异步注册映射，等宏任务冲刷全部微任务
    await new Promise((r) => setTimeout(r, 0));

    expect(
      w.resolveApproval({
        approvalRequestId: 'apr_1',
        executionRunId: 'run-1',
        status: 'rejected',
        resolution: 'rejected',
        resolutionNote: '高危操作',
      }),
    ).toBe(true);
    expect(api.post).toHaveBeenCalledWith(
      RUNTIME_ENDPOINTS.executionEvents('run-1'),
      expect.objectContaining({ status: 'rejected' }),
    );
    expect(
      w.resolveApproval({
        approvalRequestId: 'apr_unknown',
        executionRunId: 'run-1',
        status: 'rejected',
        resolution: 'rejected',
      }),
    ).toBe(false);
  });
});
