import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============ 验收契约（Acceptance）============

/** 契约关联任务摘要（findOne/create include） */
export class AcceptanceIssueBriefDto {
  @ApiProperty({ type: String }) id: string;
  @ApiPropertyOptional({ type: String, description: '任务标题' })
  title?: string;
  @ApiPropertyOptional({ type: String, description: '任务状态' })
  status?: string;
  @ApiPropertyOptional({ type: String, description: '归属项目 ID' })
  projectId?: string;
  @ApiPropertyOptional({
    description: '归属项目',
    type: Object,
    additionalProperties: true,
  })
  project?: { id: string; name: string };
}

/** 验收标准（AcceptanceCriteria） */
export class AcceptanceCriteriaDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '所属契约 ID' })
  acceptanceId: string;
  @ApiProperty({
    type: String,
    description: '标准类型：functional | technical',
  })
  criteriaType: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '类别（功能/性能/安全...）',
  })
  category?: string | null;
  @ApiProperty({ type: String, description: '标准内容' })
  content: string;
  @ApiProperty({
    type: String,
    description: '来源：manual | template | audit ...',
  })
  source: string;
  @ApiProperty({ type: Number, description: '权重' })
  weight: number;
  @ApiProperty({
    type: String,
    description: '状态：pending | passed | failed ...',
  })
  status: string;
  @ApiProperty({
    type: String,
    description: '严重度：low | medium | high | critical',
  })
  severity: string;
  @ApiProperty({ type: Number, description: '排序序号' })
  order: number;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '通过时间（ISO）',
  })
  passedAt?: string | null;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** 验收证据（AcceptanceEvidence） */
export class AcceptanceEvidenceDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '所属标准 ID' })
  criteriaId: string;
  @ApiProperty({
    type: String,
    description:
      '证据类型：ci_result | pr_review | model_evaluation | human_approval | screenshot | log | test_result',
  })
  evidenceType: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '证据内容（短文本）',
  })
  content?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '存储引用（文件路径/URL）',
  })
  storageRef?: string | null;
  @ApiProperty({ type: String, description: '提交者 ID' })
  submittedBy: string;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** 带证据的验收标准（GET :id/criteria / apply 返回项） */
export class AcceptanceCriteriaWithEvidenceDto extends AcceptanceCriteriaDto {
  @ApiPropertyOptional({
    type: [AcceptanceEvidenceDto],
    description: '证据列表（按时间倒序）',
  })
  evidences?: AcceptanceEvidenceDto[];
}

/** 验收契约（含任务摘要与标准列表；create/findOne/update/accept/reject/waive 返回） */
export class AcceptanceResponseDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '关联任务 ID' })
  issueId: string;
  @ApiProperty({
    type: String,
    description: '状态：draft | pending | in_review | passed | failed | waived',
  })
  status: string;
  @ApiProperty({
    type: String,
    description: '类型：functional | technical | mixed',
  })
  type: string;
  @ApiProperty({ type: String, description: '优先级' })
  priority: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '验收标题',
  })
  title?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '验收描述',
  })
  description?: string | null;
  @ApiProperty({
    type: String,
    description: '完成契约类型：pr | test_report | document | artifact',
  })
  completionType: string;
  @ApiPropertyOptional({
    description: '完成证据快照',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  completionEvidence?: Record<string, unknown> | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: '完成人' })
  completedBy?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '完成时间（ISO）',
  })
  completedAt?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '驳回时间（ISO）',
  })
  rejectedAt?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '驳回原因',
  })
  rejectionReason?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '豁免时间（ISO）',
  })
  waivedAt?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: '豁免人' })
  waivedBy?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '豁免原因',
  })
  waiverReason?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: '创建人' })
  createdBy?: string | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: '累计成本（USD）',
  })
  totalCost?: number | null;
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: '累计 tokens',
  })
  totalTokens?: number | null;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiPropertyOptional({ type: AcceptanceIssueBriefDto, nullable: true })
  issue?: AcceptanceIssueBriefDto | null;
  @ApiPropertyOptional({
    type: [AcceptanceCriteriaDto],
    description: '验收标准列表',
  })
  criteria?: AcceptanceCriteriaDto[];
}

// ============ 完整性审计 ============

/** 审计发现/通过项 */
export class AuditItemDto {
  @ApiProperty({
    type: String,
    description: '项类型：dependency | engineering | engineering',
  })
  type: string;
  @ApiPropertyOptional({ type: String, description: '关联标准/依赖 ID' })
  id?: string;
  @ApiProperty({ type: String, description: '项内容' })
  content: string;
  @ApiPropertyOptional({ type: String, description: '类别' })
  category?: string;
  @ApiProperty({ type: String, description: '严重度' })
  severity: string;
  @ApiPropertyOptional({ type: String, description: '来源' })
  source?: string;
  @ApiPropertyOptional({ type: String, description: '补全建议' })
  suggestion?: string;
  @ApiProperty({ type: Boolean, description: '是否可自动修复' })
  autoFixable: boolean;
}

/** 审计结果（completeness-audit.service AuditResult） */
export class AuditResultDto {
  @ApiProperty({
    description: '风险级别：red（强阻断）| yellow（建议）| green（通过）',
    enum: ['red', 'yellow', 'green'],
  })
  riskLevel: 'red' | 'yellow' | 'green';

  @ApiProperty({ type: [AuditItemDto], description: '强阻断项' })
  blockedItems: AuditItemDto[];

  @ApiProperty({ type: [AuditItemDto], description: '建议补全项' })
  suggestedItems: AuditItemDto[];

  @ApiProperty({ type: [AuditItemDto], description: '已通过项' })
  passedItems: AuditItemDto[];

  @ApiProperty({ type: String, description: '审计摘要' })
  summary: string;
}

/** 持久化审计报告（CompletenessAuditReport） */
export class AuditReportDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '契约 ID' })
  acceptanceId: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: '清单 ID' })
  checklistId?: string | null;
  @ApiProperty({ type: String, description: '风险级别：red | yellow | green' })
  riskLevel: string;
  @ApiProperty({
    type: [AuditItemDto],
    description: '强阻断项列表',
  })
  blockedItems: AuditItemDto[];
  @ApiProperty({
    type: [AuditItemDto],
    description: '建议补全项列表',
  })
  suggestedItems: AuditItemDto[];
  @ApiProperty({
    type: [AuditItemDto],
    description: '已通过项列表',
  })
  passedItems: AuditItemDto[];
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '审计摘要',
  })
  summary?: string | null;
  @ApiProperty({ type: String, description: '审计时间（ISO）' })
  auditDate: string;
}

/** POST :id/audit 与 POST :id/apply-suggestions 返回 */
export class AuditRunResponseDto {
  @ApiProperty({ type: AuditReportDto, description: '持久化审计报告' })
  report: AuditReportDto;

  @ApiProperty({ type: AuditResultDto, description: '本次审计结果' })
  result: AuditResultDto;
}

/** GET :id/audit-report 返回（含 acceptance/checklist 摘要，可为 null） */
export class AuditReportDetailDto extends AuditReportDto {
  @ApiPropertyOptional({
    description: '关联契约摘要 { id, issueId }',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  acceptance?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: '关联清单摘要 { id, name, techStack }',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  checklist?: Record<string, unknown> | null;
}

/** GET issue/:issueId/audit-gate 返回 */
export class AuditGateResponseDto {
  @ApiProperty({ type: Boolean, description: '是否允许派发执行' })
  allowed: boolean;

  @ApiPropertyOptional({
    type: AuditReportDto,
    description: '当前审计报告（无报告时缺省）',
  })
  report?: AuditReportDto;

  @ApiPropertyOptional({ type: String, description: '门禁结论说明' })
  message?: string;
}

// ============ 完成契约校验 ============

/** POST :id/validate-completion 返回 */
export class ValidateCompletionResponseDto {
  @ApiProperty({ type: Boolean, description: '证据是否齐备' })
  valid: boolean;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '检查项名称' },
        ok: { type: 'boolean', description: '是否通过' },
        reason: { type: 'string', description: '未通过原因' },
      },
      required: ['name', 'ok'],
    },
    description: '逐项检查结果',
  })
  checks: Array<{ name: string; ok: boolean; reason?: string }>;
}

// ============ 工程清单（Checklist）============

/** 完整性清单（CompletenessChecklist） */
export class ChecklistDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '清单名称' })
  name: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '清单描述',
  })
  description?: string | null;
  @ApiProperty({
    type: String,
    description: '项目类型：backend | frontend | mobile | library | api',
  })
  projectType: string;
  @ApiProperty({ type: String, description: '技术栈（如 ts-node / react）' })
  techStack: string;
  @ApiProperty({ type: Boolean, description: '是否系统预置' })
  isSystem: boolean;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '团队自定义所有者',
  })
  ownerId?: string | null;
  @ApiProperty({
    description: '清单内容结构（[{category,content,severity}]）',
    type: Object,
    additionalProperties: true,
  })
  checklist: Record<string, unknown>;
  @ApiProperty({ type: Number, description: '版本号' })
  version: number;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
}

/** POST checklists/:id/apply 返回 */
export class ApplyChecklistResponseDto {
  @ApiProperty({ type: ChecklistDto, description: '被应用的清单' })
  checklist: ChecklistDto;

  @ApiProperty({ type: Number, description: '创建的验收标准数量' })
  createdCount: number;

  @ApiProperty({
    type: [AcceptanceCriteriaDto],
    description: '新创建的验收标准',
  })
  criteria: AcceptanceCriteriaDto[];
}
