import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Matches,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIssueTypeDto {
  @ApiProperty({
    description: '类型键（小写 slug，创建后不可改）',
    example: 'page',
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]{1,31}$/, {
    message: 'key 必须是小写字母开头的 2-32 位 slug',
  })
  key: string;

  @ApiProperty({ description: '类型名称', example: '页面' })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({ description: 'lucide 图标名', example: 'FileCode' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({ description: '颜色（hex）', example: '#8B5CF6' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color 必须是 6 位 hex' })
  color?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  order?: number;
}

export class UpdateIssueTypeDto {
  @ApiPropertyOptional({ description: '类型名称' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiPropertyOptional({ description: 'lucide 图标名' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({ description: '颜色（hex）' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color 必须是 6 位 hex' })
  color?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  order?: number;
}

export class IssueTypeUsageDto {
  @ApiPropertyOptional({ description: '是否返回任务引用计数' })
  @IsOptional()
  @IsBoolean()
  withUsage?: boolean;
}
