/**
 * Skill 创建 DTO
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({ description: '技能唯一 key（小写字母/数字/连字符）' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'key 只能含小写字母、数字与连字符',
  })
  @MinLength(2)
  @MaxLength(64)
  key!: string;

  @ApiProperty({ description: '技能名' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: 'Development' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string;

  @ApiPropertyOptional({
    type: String,
    description: '技能驱动指令全文；缺省且给 sourcePath 时读文件物化',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  content?: string;

  @ApiPropertyOptional({
    type: String,
    description: '导入来源的本地 SKILL.md 路径（留档）',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  sourcePath?: string;
}
