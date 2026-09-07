import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============ 元数据响应契约（metadata Prisma 模型投影）============

/** 标签（Tag） */
export class TagDto {
  @ApiProperty({ type: String }) id: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '归属项目 ID（空为全局标签）',
  })
  projectId?: string | null;
  @ApiProperty({ type: String }) name: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: '颜色' })
  color?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: '描述' })
  description?: string | null;
  @ApiProperty({
    type: String,
    description: '归属功能域：project | task | bug | document',
  })
  resourceType: string;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '创建人 ID',
  })
  createdBy?: string | null;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 状态定义（StatusDefinition） */
export class StatusDefinitionDto {
  @ApiProperty({ type: String }) id: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '归属项目 ID（空为全局默认）',
  })
  projectId?: string | null;
  @ApiProperty({ type: String, description: '状态族类型（如 issue）' })
  type: string;
  @ApiProperty({ type: String, description: '状态键' })
  key: string;
  @ApiProperty({ type: String, description: '显示名' })
  name: string;
  @ApiProperty({ type: Number, description: '排序序号' })
  order: number;
  @ApiProperty({ type: Boolean, description: '是否终态' })
  isFinal: boolean;
  @ApiProperty({ type: Boolean, description: '是否阻塞态' })
  isBlockedState: boolean;
  @ApiPropertyOptional({
    description: '允许流转的下一状态键列表',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  allowedNextStatusKeys?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 项目角色定义（ProjectRoleDefinition） */
export class ProjectRoleDto {
  @ApiProperty({ type: String }) id: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '归属项目 ID（空为全局默认）',
  })
  projectId?: string | null;
  @ApiProperty({ type: String, description: '角色键' })
  key: string;
  @ApiProperty({ type: String, description: '显示名' })
  name: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: '描述' })
  description?: string | null;
  @ApiProperty({
    type: String,
    description: '执行角色：coder | reviewer | pm | qa | general',
  })
  executionRole: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '项目级角色绑定的 CLI Provider ID',
  })
  defaultCliProviderId?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '注入 CLI prompt 的角色行为提示',
  })
  promptHint?: string | null;
  @ApiPropertyOptional({
    description: '默认负责人 ID 列表',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  defaultAssigneeIds?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 项目模板（ProjectTemplate） */
export class ProjectTemplateDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String }) name: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '模板描述',
  })
  description?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '基准项目类型',
  })
  baseProjectType?: string | null;
  @ApiPropertyOptional({
    description: '默认标签配置',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  defaultTags?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '默认状态流配置',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  defaultStatuses?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '默认迭代配置',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  defaultIterations?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '默认任务配置',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  defaultTasks?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '创建人 ID',
  })
  createdBy?: string | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}
