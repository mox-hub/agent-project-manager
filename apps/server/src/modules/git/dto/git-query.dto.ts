import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNotEmpty,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RepositoryQueryDto {
  @ApiPropertyOptional({ description: '按项目 ID 过滤' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: '按托管平台过滤' })
  @IsString()
  @IsOptional()
  provider?: string;
}

export class CommitQueryDto {
  @ApiPropertyOptional({ description: '起始时间（ISO 或 git 日期表达式）' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: '截止时间（ISO 或 git 日期表达式）' })
  @IsString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ description: '按作者过滤' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: '按文件路径过滤' })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({ description: '提交信息关键字搜索' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}

export class DiffQueryDto {
  @ApiProperty({ description: '仓库 ID' })
  @IsString()
  @IsNotEmpty()
  repoId: string;

  @ApiProperty({ description: '基准分支/提交' })
  @IsString()
  @IsNotEmpty()
  baseRef: string;

  @ApiProperty({ description: '目标分支/提交' })
  @IsString()
  @IsNotEmpty()
  targetRef: string;

  @ApiPropertyOptional({ description: '路径过滤列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pathFilter?: string[];
}

export class PullRequestQueryDto {
  @ApiPropertyOptional({ description: '按状态过滤' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '按作者过滤' })
  @IsString()
  @IsOptional()
  author?: string;
}
