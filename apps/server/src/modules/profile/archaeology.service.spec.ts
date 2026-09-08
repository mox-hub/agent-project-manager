import { NotFoundException } from '@nestjs/common';
import { ArchaeologyService } from './archaeology.service';
import { PrismaService } from '../../core/database/prisma.service';
import { IssueService } from '@/modules/issue/issue.service';
import { CliDispatchService } from '@/modules/cli-dispatch/dispatch.service';

/**
 * 考古服务单测：start 返回契约口径的轮询句柄。
 * 回归锚点：DispatchResult 内部字段叫 executionRunId，契约/前端轮询要的是
 * executionId——透传内部形状会让前端拿到 undefined、轮询永不启动（空转圈）。
 */

const prismaMock = {
  project: { findUnique: jest.fn() },
};
const issueServiceMock = { create: jest.fn() };
const cliDispatchMock = { dispatchTaskToCli: jest.fn() };

const service = new ArchaeologyService(
  prismaMock as unknown as PrismaService,
  issueServiceMock as unknown as IssueService,
  cliDispatchMock as unknown as CliDispatchService,
);

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.project.findUnique.mockResolvedValue({
    id: 'p1',
    name: '演示项目',
  });
  issueServiceMock.create.mockResolvedValue({ id: 'issue-1' });
});

describe('ArchaeologyService.start', () => {
  it('返回契约句柄：executionId 取自派发的 executionRunId', async () => {
    cliDispatchMock.dispatchTaskToCli.mockResolvedValue({
      executionRunId: 'run-1',
      cliSessionId: 'sess-1',
      status: 'dispatched',
    });

    const res = await service.start('p1', 'user-1');

    expect(res.executionId).toBe('run-1');
    expect(res.issueId).toBe('issue-1');
    // 内部字段不得泄漏到契约响应
    expect(res).not.toHaveProperty('executionRunId');
    expect(res).not.toHaveProperty('status');
  });

  it('派发黄牌透传 auditWarning，无黄牌时不带该键', async () => {
    cliDispatchMock.dispatchTaskToCli.mockResolvedValue({
      executionRunId: 'run-2',
      status: 'dispatched',
      auditWarning: '契约审计 red',
    });
    const warned = await service.start('p1', 'user-1');
    expect(warned.auditWarning).toBe('契约审计 red');

    cliDispatchMock.dispatchTaskToCli.mockResolvedValue({
      executionRunId: 'run-3',
      status: 'dispatched',
    });
    const clean = await service.start('p1', 'user-1');
    expect(clean).not.toHaveProperty('auditWarning');
  });

  it('考古任务包经 promptOverride 下发（只读约束 + 槽位模板）', async () => {
    cliDispatchMock.dispatchTaskToCli.mockResolvedValue({
      executionRunId: 'run-4',
      status: 'dispatched',
    });

    await service.start('p1', 'user-1');

    const options = cliDispatchMock.dispatchTaskToCli.mock.calls[0][2];
    expect(options.promptOverride).toContain('项目考古（演示项目）');
    expect(options.promptOverride).toContain('只读');
    expect(options.promptOverride).toContain('tech-stack');
  });

  it('项目不存在抛 404', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);
    await expect(service.start('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
