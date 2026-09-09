import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  CONTRACT_FILE_TYPES,
  CONTRACT_SYNC_MODES,
} from '../contract-binding.service';

const FILE_TYPES = [...CONTRACT_FILE_TYPES];
const SYNC_MODES = [...CONTRACT_SYNC_MODES];

export class SeedContractFilesDto {
  @ApiPropertyOptional({
    enum: FILE_TYPES,
    isArray: true,
    description: '仅种生指定类型（缺省全量三件套）',
  })
  @IsOptional()
  @IsArray()
  @IsIn(FILE_TYPES, { each: true })
  fileTypes?: string[];

  @ApiPropertyOptional({
    description:
      '格式化纳管：已有文件仅并入 apm_ frontmatter 并建 synced 观察绑定，不注入托管区间',
  })
  @IsOptional()
  @IsBoolean()
  formatOnly?: boolean;
}

export class CheckAlignmentDto {
  @ApiPropertyOptional({
    enum: FILE_TYPES,
    description: '仅检查指定类型（缺省检查全部已绑定类型）',
  })
  @IsOptional()
  @IsIn(FILE_TYPES)
  @IsString()
  fileType?: string;
}

export class UpdateContractBindingDto {
  @ApiProperty({ enum: SYNC_MODES, description: '目标同步模式' })
  @IsIn(SYNC_MODES)
  syncMode!: string;
}

export class ContractBindingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectId!: string;
  @ApiProperty({ enum: FILE_TYPES }) fileType!: string;
  @ApiProperty({ description: '工作区根相对路径（POSIX）' }) filePath!: string;
  @ApiProperty({ enum: SYNC_MODES }) syncMode!: string;
  @ApiProperty() truthOwner!: string;
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: '基线指纹 sha256',
  })
  baseline?: string | null;
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'null | conflicted',
  })
  conflictState?: string | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  lastWriter?: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
}

export class ContractBindingsResponseDto {
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: '当前工作区根（未绑定为 null）',
  })
  workspaceRoot?: string | null;
  @ApiProperty({ type: [ContractBindingResponseDto] })
  bindings!: ContractBindingResponseDto[];
}

export class SeedFileResultDto {
  @ApiProperty() path!: string;
  @ApiProperty({
    enum: [
      'created',
      'updated',
      'adopted',
      'skipped_unchanged',
      'skipped_existing',
      'skipped_no_workspace',
    ],
  })
  action!: string;
  @ApiPropertyOptional() bindingId?: string;
}

export class SeedContractResultDto {
  @ApiProperty() projectId!: string;
  @ApiPropertyOptional({ nullable: true, type: String })
  workspaceRoot?: string | null;
  @ApiProperty({ type: [SeedFileResultDto] }) files!: SeedFileResultDto[];
}

export class AlignmentDiffDto {
  @ApiProperty({ description: '托管区间 id' }) id!: string;
  @ApiProperty({ enum: ['equal', 'file_differs', 'missing_in_file'] })
  state!: string;
}

export class ContractAlignmentReportDto {
  @ApiProperty({ enum: FILE_TYPES }) fileType!: string;
  @ApiProperty({
    enum: ['aligned', 'conflicted', 'skipped_detached', 'missing_file'],
  })
  state!: string;
  @ApiPropertyOptional({ type: [AlignmentDiffDto] }) diffs?: AlignmentDiffDto[];
  @ApiPropertyOptional({ description: '升级出的冲突提案 id' })
  proposalId?: string;
}
