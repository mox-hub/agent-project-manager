import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { CreateIssueDto } from '@/modules/issue/dto/create-issue.dto';
import { CreateProjectDto } from '@/modules/project/dto/create-project.dto';
import { ResolveApprovalDto } from '@/modules/document/dto/approval.dto';

/**
 * 枚举/取值集校验的报错可读性锚点：DTO 的取值集约束一律用
 * @IsIn（字面量数组）或 @IsEnum（具名 TS 枚举）。@IsEnum 直接收数组时
 * class-validator 会把数字键全部滤掉，报错退化为
 * "must be one of the following values: "（合法值清单为空）。
 * 本 spec 以线上同配 ValidationPipe 抽查三个真实 DTO，锁住报错必须
 * 列出合法值清单的行为。
 */

const pipe = () =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  });

async function rejectMessage(
  dto: new () => object,
  value: Record<string, unknown>,
): Promise<string> {
  try {
    await pipe().transform(value, { type: 'body', metatype: dto });
  } catch (err) {
    expect(err).toBeInstanceOf(BadRequestException);
    const response = (err as BadRequestException).getResponse() as {
      message: string | string[];
    };
    return Array.isArray(response.message)
      ? response.message.join(' | ')
      : response.message;
  }
  throw new Error('预期校验失败，但管道放行了');
}

describe('DTO 取值集校验报错（枚举报错列出合法值清单）', () => {
  it('CreateIssueDto.type 非法值报错包含 task/bug 全清单', async () => {
    const message = await rejectMessage(CreateIssueDto, {
      type: 'story',
    });
    expect(message).toContain('type');
    expect(message).toContain('task, bug');
    // 取值清单不再为空（空清单即回归）
    expect(message).not.toMatch(/following values:\s*$/);
    expect(message).not.toMatch(/following values:\s*\|/);
  });

  it('CreateProjectDto.visibility 非法值报错列出三种可见性', async () => {
    const message = await rejectMessage(CreateProjectDto, {
      name: '可见性枚举报错项目',
      visibility: 'secret',
    });
    expect(message).toContain('visibility');
    expect(message).toContain('private, internal, public');
  });

  it('ResolveApprovalDto.status 非法值报错列出 approved/rejected', async () => {
    const message = await rejectMessage(ResolveApprovalDto, {
      status: 'maybe',
    });
    expect(message).toContain('status');
    expect(message).toContain('approved, rejected');
  });

  it('合法值照常放行（IsIn 语义与原 IsEnum 数组一致）', async () => {
    const resolved = await pipe().transform(
      { status: 'approved', comment: '通过' },
      { type: 'body', metatype: ResolveApprovalDto },
    );
    expect(resolved).toMatchObject({ status: 'approved', comment: '通过' });
  });
});
