import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { IssueService } from '@/modules/issue/issue.service';
import { CliDispatchService } from '@/modules/cli-dispatch/dispatch.service';
import { StartArchaeologyDto } from './dto/profile.dto';
import {
  PROFILE_DRAFT_SCHEMA_VERSION,
  PROFILE_DRAFT_ARTIFACT_TYPE,
} from './profile-draft.schema';
import { PROFILE_SLOT_DEFINITIONS } from './profile-slot.registry';

/**
 * 项目考古（v2 纪要切片 1，老手接入路径）：
 * 派 CLI Agent 只读扫描已接入的 Git 仓库，产出按槽位组织的结构化档案草稿。
 *
 * 容器复用：考古建一条系统署名的内部 issue（可追溯、复用 Execution/派发/事件全链路），
 * 任务包经 DispatchOptions.promptOverride 覆盖默认组装（只读约束 + 槽位 JSON 模板）。
 * 产物落库走拉取式 ingest（profile.service.ingestArchaeology），写入不在热路径。
 */

export const ARCHAEOLOGY_ISSUE_TITLE_PREFIX = '项目考古';

/** 轮询句柄（契约口径 ArchaeologyStartResponseDto）：前端据 executionId 轮询执行详情 */
export interface ArchaeologyStartResult {
  issueId: string;
  executionId: string;
  auditWarning?: string;
}

@Injectable()
export class ArchaeologyService {
  private readonly logger = new Logger(ArchaeologyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly issueService: IssueService,
    private readonly cliDispatch: CliDispatchService,
  ) {}

  /** 触发考古：建内部 issue + 派发，返回轮询句柄（issueId + executionId） */
  async start(
    projectId: string,
    userId: string,
    dto: StartArchaeologyDto = {},
  ): Promise<ArchaeologyStartResult> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const issue = await this.issueService.create(
      {
        projectId,
        title: `${ARCHAEOLOGY_ISSUE_TITLE_PREFIX}：${project.name}`,
        description:
          '系统自动创建的考古任务：AI 只读扫描仓库生成项目档案草稿，' +
          '产物经档案页「草稿区」人工批准后生效。本任务不修改任何仓库文件。',
      },
      userId,
    );

    const prompt = this.buildPrompt(project.name);
    // 工具白名单不在此覆盖：CLI 工具名大小写各异（Read/Glob/Grep），
    // 小写白名单会让 Agent 无工具可调、空转收工；只读约束由任务包承担。
    const result = await this.cliDispatch.dispatchTaskToCli(issue.id, userId, {
      ...(dto.memberId ? { memberId: dto.memberId } : {}),
      ...(dto.providerId
        ? {
            providerId: dto.providerId as 'claude-code' | 'codex' | 'zcode',
          }
        : {}),
      promptOverride: prompt,
    });

    this.logger.log(
      `Archaeology started for project ${projectId}: issue=${issue.id} execution=${result.executionRunId}`,
    );
    // 契约字段是 executionId，DispatchResult 内部叫 executionRunId——禁止透传内部形状
    return {
      issueId: issue.id,
      executionId: result.executionRunId,
      ...(result.auditWarning ? { auditWarning: result.auditWarning } : {}),
    };
  }

  /**
   * 考古任务包：只读约束 + 诚实边界 + 槽位 JSON 模板。
   * 角色与个人提示词由派发链注入（promptOverride 仅替换 Task/Context 段之外的默认组装），
   * 因此这里自带完整任务包语义，不依赖成员角色。
   */
  private buildPrompt(projectName: string): string {
    const slotGuide = Object.values(PROFILE_SLOT_DEFINITIONS)
      .map((d) => `- ${d.key}（${d.label}）：${d.archaeologyGuide}`)
      .join('\n');

    const outputTemplate = {
      schemaVersion: PROFILE_DRAFT_SCHEMA_VERSION,
      slots: [
        {
          slot: 'tech-stack',
          items: [{ content: '…', confidence: 0.5, evidence: 'package.json' }],
        },
      ],
      summary: '一句话总结项目现状',
    };

    return [
      `# 任务：项目考古（${projectName}）`,
      '',
      '你是项目考古员。对当前工作目录的代码仓库做**只读**扫描，产出结构化项目档案草稿，供人类校对后归档。',
      '',
      '## 硬约束',
      '- 只读：不创建、不修改、不删除任何文件，不执行任何写操作命令。',
      '- 诚实边界：没扫到、不确定的槽位就留空或省略，绝不编造；每条结论给出证据出处（文件路径/配置位置）。',
      '- 原子化：每条 content 只说一个事实/结论，一句话说清，不要长篇大论。',
      '- 置信度保守：有直接证据 ≤0.6，推断 ≤0.4。',
      '',
      '## 收集指南（按槽位）',
      slotGuide,
      '',
      '## 输出契约（严格 JSON，作为 artifact 类型 ' +
        `'${PROFILE_DRAFT_ARTIFACT_TYPE}'` +
        ' 输出）',
      '在最终回复中输出**且仅输出**一个 JSON 对象（不要 markdown 代码围栏外的其他内容）：',
      '',
      '```json',
      JSON.stringify(outputTemplate, null, 2),
      '```',
      '',
      'slots 数组可包含任意多个内置槽位（tech-stack / module-map / conventions / risks / tech-debts），没发现的槽位直接省略。',
    ].join('\n');
  }
}
