import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 办公室页（AI 同事化 · 候选 C）聚合契约：
 * 「走进办公室 = 先看得见他」——每个 AI 成员一张员工卡：
 * 在干什么（当前执行）、忙不忙（状态派生）、压着多少待决（归因计数）、
 * 还能接多少活（容量/预算/信任派生的可接活度，非假日历）。
 * 全部为派生量，无独立状态存储；口径与 dashboard / decision 对齐。
 */

export class OfficeCapacityDto {
  @ApiProperty({
    description: '在途执行数（planned/in_progress/pending_approval）',
  })
  activeRuns: number;

  @ApiProperty({
    description:
      '临时容量口径（与 dashboard avgLoadPct 同源的人均活跃执行上限）',
  })
  capacityLimit: number;

  @ApiProperty({ description: '负载百分比（0-100 封顶）' })
  loadPct: number;

  @ApiProperty({ description: '本周消耗 tokens（ExecutionRun 汇总口径）' })
  weeklyTokens: number;

  @ApiProperty({
    description: '本周消耗成本（USD，ExecutionRun.totalCost 汇总）',
  })
  weeklyCostUsd: number;

  @ApiPropertyOptional({
    description: '项目周预算 tokens（Project.config.aiBudget，仅项目域返回）',
  })
  budgetTokens?: number;

  @ApiPropertyOptional({ description: '项目周预算 USD（仅项目域返回）' })
  budgetCostUsd?: number;

  @ApiPropertyOptional({
    description: '预算使用百分比（tokens/成本取高者；无预算不返回）',
  })
  budgetUsagePct?: number;

  @ApiProperty({
    description:
      '可接活度：available=可接；busy=趋于饱和；saturated=满载或超预算',
    enum: ['available', 'busy', 'saturated'],
  })
  acceptability: 'available' | 'busy' | 'saturated';
}

export class OfficeCurrentRunDto {
  @ApiProperty({ description: 'ExecutionRun ID' })
  id: string;

  @ApiProperty({ description: '执行目标' })
  goal: string;

  @ApiProperty({ description: '执行状态' })
  status: string;

  @ApiPropertyOptional({ description: '关联任务标题' })
  taskTitle?: string;

  @ApiPropertyOptional({ description: '开始时间（ISO）' })
  startedAt?: string;
}

export class OfficeColleagueDto {
  @ApiProperty({ description: '成员 ID（Member.id）' })
  memberId: string;

  @ApiProperty({ description: '显示名' })
  displayName: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '职务' })
  title?: string;

  @ApiPropertyOptional({
    description: '默认执行角色（coder/reviewer/pm/qa/general）',
  })
  executionRole?: string;

  @ApiPropertyOptional({ description: '信任等级' })
  trustLevel?: number;

  @ApiPropertyOptional({ description: '信任分（0-100）' })
  trustScore?: number;

  @ApiProperty({
    description:
      '忙闲派生（与前端 deriveAssistantStatus 同口径）：needYou > working > suggestions > idle',
    enum: ['needYou', 'working', 'suggestions', 'idle'],
  })
  status: 'needYou' | 'working' | 'suggestions' | 'idle';

  @ApiProperty({
    description: '归因到该成员的 blocking 待决（其执行流上 pending 审批）',
  })
  blocking: number;

  @ApiProperty({
    description: '归因到该成员的 advisory 待决（其提案 + 其交付的待验收）',
  })
  advisory: number;

  @ApiProperty({ type: OfficeCapacityDto, description: '容量/可接活度' })
  capacity: OfficeCapacityDto;

  @ApiProperty({
    type: OfficeCurrentRunDto,
    nullable: true,
    description: '当前执行（最近一条在途）',
  })
  currentRun: OfficeCurrentRunDto | null;

  @ApiPropertyOptional({ description: '最近一条执行（含终态）时间（ISO）' })
  lastRunAt?: string;

  @ApiPropertyOptional({
    description: '最近会话时间（ISO，AIConversation.createdBy 归因）',
  })
  recentConversationAt?: string;

  @ApiPropertyOptional({
    description: '当前在途派发的 CLI provider（无在途派发不返回）',
  })
  currentProvider?: string;
}

export class OfficeTotalsDto {
  @ApiProperty({ description: 'AI 成员数' })
  colleagues: number;

  @ApiProperty({ description: 'working 状态数' })
  working: number;

  @ApiProperty({ description: 'needYou 状态数' })
  needYou: number;

  @ApiProperty({ description: 'blocking 待决总数' })
  blocking: number;

  @ApiProperty({ description: 'advisory 待决总数' })
  advisory: number;
}

export class OfficeSummaryDto {
  @ApiPropertyOptional({ description: '项目域（不传为工作区全域）' })
  projectId?: string;

  @ApiProperty({ type: [OfficeColleagueDto], description: 'AI 同事员工卡列表' })
  colleagues: OfficeColleagueDto[];

  @ApiProperty({ type: OfficeTotalsDto, description: '汇总' })
  totals: OfficeTotalsDto;
}
