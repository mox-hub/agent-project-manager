import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 团队成员负载行 */
export class DashboardTeamMemberDto {
  @ApiProperty({ description: '成员 ID' })
  id: string;

  @ApiProperty({ description: '成员显示名' })
  name: string;

  @ApiProperty({ description: '职务（缺省回落成员类型）' })
  role: string;

  @ApiProperty({ description: '活跃任务数' })
  activeTasks: number;

  @ApiProperty({ description: '本周完成任务数' })
  completedThisWeek: number;
}

export class DashboardTeamDto {
  @ApiProperty({ description: '活跃成员总数' })
  totalMembers: number;

  @ApiProperty({ description: '全员活跃任务数' })
  activeTasks: number;

  @ApiProperty({ description: '平均负载百分比（0-100）' })
  avgLoadPct: number;

  @ApiProperty({
    type: [DashboardTeamMemberDto],
    description: '按负载倒序，最多 10 行',
  })
  members: DashboardTeamMemberDto[];
}

export class DashboardTopActivityDto {
  @ApiProperty({ description: '活动类型' })
  activity: string;

  @ApiProperty()
  count: number;
}

export class DashboardAiDto {
  @ApiProperty({ description: 'AI 会话总数' })
  conversations: number;

  @ApiProperty({ description: '本周新增会话数' })
  weeklyGrowth: number;

  @ApiProperty({ description: '本月消耗 token 总数' })
  tokensUsed: number;

  @ApiProperty({
    type: [DashboardTopActivityDto],
    description: 'AI 成员近 30 天高频活动（最多 5 项）',
  })
  topActivities: DashboardTopActivityDto[];
}

export class DashboardCostCategoryDto {
  @ApiProperty({ description: '供应商名' })
  name: string;

  @ApiProperty({ description: '成本（USD，两位小数）' })
  amount: number;

  @ApiProperty({ description: '占比百分比（0-100）' })
  percentage: number;
}

export class DashboardCostDto {
  @ApiProperty({ description: '本月成本合计（USD）' })
  monthTotal: number;

  @ApiProperty({ description: '预算偏差百分比（预算基线未落地，恒为 0）' })
  budgetDeltaPct: number;

  @ApiProperty({
    type: [DashboardCostCategoryDto],
    description: '按供应商分摊',
  })
  byCategory: DashboardCostCategoryDto[];
}

export class DashboardPriorityCountDto {
  @ApiProperty({
    description: '契约优先级',
    enum: ['urgent', 'high', 'medium', 'low'],
  })
  priority: string;

  @ApiProperty()
  count: number;
}

export class DashboardDeliveryDto {
  @ApiProperty({ description: '非 Bug 活跃任务数' })
  activeTasks: number;

  @ApiProperty({ description: '非 Bug 任务总数' })
  totalTasks: number;

  @ApiProperty({ type: [DashboardPriorityCountDto] })
  byPriority: DashboardPriorityCountDto[];

  @ApiProperty({ description: '未解决严重 Bug 数' })
  criticalBugs: number;

  @ApiProperty({ description: '未解决 Bug 数' })
  openBugs: number;

  @ApiProperty({ description: '已解决 Bug 数' })
  resolvedBugs: number;
}

export class DashboardProjectHealthDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: '健康分（0-100）' })
  score: number;

  @ApiProperty({ description: '健康状态' })
  status: string;
}

export class DashboardHealthDto {
  @ApiProperty({ description: '活跃项目健康分均值' })
  avgScore: number;

  @ApiProperty({
    type: [DashboardProjectHealthDto],
    description: '活跃项目健康明细',
  })
  projects: DashboardProjectHealthDto[];
}

export class DashboardRiskItemDto {
  @ApiProperty({ description: '来源任务 ID' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({
    description: '风险级别',
    enum: ['critical', 'high', 'medium'],
  })
  severity: string;

  @ApiProperty({ description: '影响描述（逾期天数 + 所属项目）' })
  impact: string;

  @ApiProperty({
    description: '缓解措施（任务 metadata.mitigation，缺省空串）',
  })
  mitigation: string;
}

export class DashboardRisksDto {
  @ApiProperty({ description: '缓解率百分比（风险登记表落地前恒为 0）' })
  mitigationRatePct: number;

  @ApiProperty({
    type: [DashboardRiskItemDto],
    description: '逾期未完成任务派生的风险项（按逾期时间正序，最多 8 条）',
  })
  items: DashboardRiskItemDto[];
}

export class DashboardProductivityDayDto {
  @ApiProperty({ description: '日期（MM-DD）' })
  date: string;

  @ApiProperty({ description: '当日完成任务数' })
  tasks: number;

  @ApiProperty({ description: '当日新建任务数' })
  velocity: number;

  @ApiProperty({ description: '质量分：非 Bug 完成占比（0-100）' })
  quality: number;
}

export class DashboardHealthTrendPointDto {
  @ApiProperty({ description: '周序号（W1-W6，越靠右越近）' })
  week: string;

  @ApiProperty({ description: '周均健康分' })
  score: number;
}

export class DashboardPerformanceMetricDto {
  @ApiProperty({
    description: '指标名（Velocity / Quality / OnTime / Collaboration）',
  })
  metric: string;

  @ApiProperty({ description: '指标值（0-100）' })
  value: number;
}

export class DashboardTrendsDto {
  @ApiProperty({
    type: [DashboardProductivityDayDto],
    description: '近 14 天交付趋势',
  })
  productivity: DashboardProductivityDayDto[];

  @ApiPropertyOptional({
    type: [DashboardHealthTrendPointDto],
    description: '近 6 周健康趋势（仅含有效周）',
  })
  health: DashboardHealthTrendPointDto[];

  @ApiProperty({
    type: [DashboardPerformanceMetricDto],
    description: '表现指标',
  })
  performance: DashboardPerformanceMetricDto[];
}

/** GET /dashboard/overview 返回：workspace 级聚合数据 */
export class DashboardOverviewResponseDto {
  @ApiProperty({ type: DashboardTeamDto })
  team: DashboardTeamDto;

  @ApiProperty({ type: DashboardAiDto })
  ai: DashboardAiDto;

  @ApiProperty({ type: DashboardCostDto })
  cost: DashboardCostDto;

  @ApiProperty({ type: DashboardDeliveryDto })
  delivery: DashboardDeliveryDto;

  @ApiProperty({ type: DashboardHealthDto })
  health: DashboardHealthDto;

  @ApiProperty({ type: DashboardRisksDto })
  risks: DashboardRisksDto;

  @ApiProperty({ type: DashboardTrendsDto })
  trends: DashboardTrendsDto;
}
