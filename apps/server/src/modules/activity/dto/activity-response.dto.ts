import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 动态操作人投影（activity.service ACTOR_SELECT） */
export class ActivityActorDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String }) username: string;
  @ApiProperty({ type: String }) displayName: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '头像 URL',
  })
  avatarUrl?: string | null;
}

/** 表情回应分组（按 emoji 聚合） */
export class ActivityReactionGroupDto {
  @ApiProperty({ type: String, description: '表情（如 👍）' })
  emoji: string;

  @ApiProperty({ type: Number, description: '该表情回应总数' })
  count: number;

  @ApiProperty({ type: [ActivityActorDto], description: '回应人列表' })
  users: ActivityActorDto[];

  @ApiProperty({ type: Boolean, description: '当前用户是否已回应' })
  reactedByMe: boolean;
}

/** 变更字段项（type 为状态变更类动态时的 diff） */
export class ActivityChangeDto {
  @ApiProperty({ type: String, description: '字段名' })
  field: string;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
    description: '旧值',
  })
  oldValue?: unknown;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
    description: '新值',
  })
  newValue?: unknown;
}

/** GET/POST/PATCH /activities 返回的单条动态（activity.service.shapeActivity） */
export class ActivityResponseDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '实体类型：task | bug | project' })
  entityType: string;
  @ApiProperty({ type: String, description: '实体 ID' })
  entityId: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '归属项目 ID',
  })
  projectId?: string | null;
  @ApiProperty({
    type: String,
    description: '动态类型（comment / 状态变更等）',
  })
  type: string;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '摘要（时间线直读用）',
  })
  summary?: string | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '正文（评论类动态）',
  })
  content?: string | null;
  @ApiPropertyOptional({
    description: '字段变更列表（非变更类动态为 null）',
    type: [ActivityChangeDto],
    nullable: true,
  })
  changes?: ActivityChangeDto[] | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '来源：user | system | digest ...',
  })
  source?: string | null;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiPropertyOptional({ type: ActivityActorDto, nullable: true })
  actor?: ActivityActorDto | null;
  @ApiProperty({
    type: [ActivityReactionGroupDto],
    description: '表情回应分组',
  })
  reactions: ActivityReactionGroupDto[];
}
