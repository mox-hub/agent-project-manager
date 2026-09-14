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
} from 'class-validator';

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
}

export class UpdateReleaseDto extends PartialType(
  OmitType(CreateReleaseDto, ['projectId'] as const),
) {}

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

  @ApiProperty({ description: '版本号' })
  version!: string;

  @ApiPropertyOptional({ description: '发版名称' })
  name?: string | null;

  @ApiPropertyOptional({ description: '发版说明（markdown）' })
  notes?: string | null;

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
