import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReleaseDto {
  @ApiProperty({ description: '项目 ID' })
  @IsString()
  projectId!: string;

  @ApiProperty({ description: '版本号（semver，项目内唯一）' })
  @IsString()
  @MinLength(1)
  version!: string;

  @ApiPropertyOptional({ description: '发版名称' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: '发版说明（markdown）' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: '发布范围（纳入本版本的工单 ID 列表）',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopeIssueIds?: string[];

  @ApiPropertyOptional({
    description:
      '所属里程碑 ID（CAP-A-16 计划-交付轴整合；须属于同项目，传 null 清除）',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  milestoneId?: string | null;
}

export class UpdateReleaseDto extends PartialType(
  OmitType(CreateReleaseDto, ['projectId'] as const),
) {}

/**
 * 交付成果清单元素（CAP-K-03 批二切片）：
 * 交付了什么（name）/ 在哪拿（location）/ 怎么验证可用（howToVerify）为必填；
 * 限制或已知问题（limitations）/ 接收人（receiver）可选。
 */
export class ReleaseDeliverableItemDto {
  @ApiProperty({ description: '成果名称（交付了什么）' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: '获取位置（在哪拿：包地址/镜像/仓库链接等）' })
  @IsString()
  @MinLength(1)
  location!: string;

  @ApiProperty({ description: '验证方式（怎么验证可用）' })
  @IsString()
  @MinLength(1)
  howToVerify!: string;

  @ApiPropertyOptional({ description: '限制或已知问题' })
  @IsOptional()
  @IsString()
  limitations?: string;

  @ApiPropertyOptional({ description: '接收人（由谁接收）' })
  @IsOptional()
  @IsString()
  receiver?: string;
}

/** 交付成果清单（Release.deliverables Json 列的存储形状：items + 最后更新溯源） */
export class ReleaseDeliverablesDto {
  @ApiProperty({
    description: '交付成果列表（可传空数组清空清单）',
    type: [ReleaseDeliverableItemDto],
  })
  items!: ReleaseDeliverableItemDto[];

  @ApiPropertyOptional({ description: '最后更新人 ID' })
  updatedBy?: string;

  @ApiPropertyOptional({ description: '最后更新时间（ISO）' })
  updatedAt?: string;
}

/** PUT /releases/:id/deliverables 请求体：全量替换交付成果清单 */
export class UpdateReleaseDeliverablesDto {
  @ApiProperty({
    description: '交付成果清单（全量替换；元素必填 name/location/howToVerify）',
    type: [ReleaseDeliverableItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleaseDeliverableItemDto)
  deliverables!: ReleaseDeliverableItemDto[];
}

export class RejectReleaseDto {
  @ApiPropertyOptional({ description: '打回原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class VersionRecommendRequestDto {
  @ApiProperty({ description: '项目 ID' })
  @IsString()
  projectId!: string;
}

export class GateCheckDto {
  @ApiProperty({ description: '检查项 key' })
  key!: string;

  @ApiProperty({ description: '检查项名称' })
  label!: string;

  @ApiProperty({ description: '是否通过' })
  passed!: boolean;

  @ApiProperty({ description: '判定说明' })
  detail!: string;
}

export class GateResultDto {
  @ApiProperty({ description: '整体是否通过' })
  passed!: boolean;

  @ApiProperty({ description: '执行时间（ISO）' })
  ranAt!: string;

  @ApiProperty({ description: '检查项列表', type: [GateCheckDto] })
  checks!: GateCheckDto[];
}

export class ExecutionStepDto {
  @ApiProperty({ description: '步骤名' })
  step!: string;

  @ApiProperty({ description: '状态', enum: ['ok', 'skipped', 'failed'] })
  status!: 'ok' | 'skipped' | 'failed';

  @ApiProperty({ description: '说明' })
  detail!: string;

  @ApiProperty({ description: '时间（ISO）' })
  at!: string;
}

export class ReleaseDto {
  @ApiProperty({ description: '发版 ID' })
  id!: string;

  @ApiProperty({ description: '项目 ID' })
  projectId!: string;

  @ApiPropertyOptional({
    description: '所属项目摘要（id + 名称；前端绑定关系可读名展示用）',
    nullable: true,
  })
  project?: { id: string; name: string } | null;

  @ApiProperty({ description: '版本号' })
  version!: string;

  @ApiPropertyOptional({ description: '发版名称' })
  name?: string | null;

  @ApiPropertyOptional({ description: '发版说明（markdown）' })
  notes?: string | null;

  @ApiPropertyOptional({
    description: '所属里程碑 ID（无关联时为 null）',
    nullable: true,
  })
  milestoneId?: string | null;

  @ApiPropertyOptional({
    description:
      '所属里程碑摘要（轻量投影：version 维度关联信息以 milestone 为准）',
    nullable: true,
  })
  milestone?: { id: string; name: string; status: string } | null;

  @ApiProperty({
    description: '状态',
    enum: ['draft', 'gated', 'approved', 'publishing', 'released', 'failed'],
  })
  status!: string;

  @ApiPropertyOptional({ description: 'git tag 名' })
  gitTag?: string | null;

  @ApiPropertyOptional({ description: '发布时间' })
  releasedAt?: string | null;

  @ApiProperty({ description: '创建人 ID' })
  createdBy!: string;

  @ApiPropertyOptional({ description: '发布范围 { issueIds }' })
  scope?: { issueIds?: string[] } | null;

  @ApiPropertyOptional({ description: '门禁快照', type: GateResultDto })
  gateResult?: GateResultDto | null;

  @ApiPropertyOptional({
    description: '发布执行步骤',
    type: [ExecutionStepDto],
  })
  executionLog?: ExecutionStepDto[] | null;

  @ApiPropertyOptional({
    description:
      '交付成果清单（CAP-K-03 批二：交付了什么/在哪拿/怎么验证/限制/接收人）',
    type: ReleaseDeliverablesDto,
    nullable: true,
  })
  deliverables?: ReleaseDeliverablesDto | null;

  @ApiPropertyOptional({ description: '失败原因' })
  failureReason?: string | null;

  @ApiPropertyOptional({ description: '审批人 ID' })
  approvedBy?: string | null;

  @ApiPropertyOptional({ description: '审批时间' })
  approvedAt?: string | null;

  @ApiProperty({ description: 'tag 是否已推送' })
  tagPushed!: boolean;

  @ApiProperty({ description: 'GitHub Release 是否已创建' })
  githubReleased!: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt!: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt!: string;
}
