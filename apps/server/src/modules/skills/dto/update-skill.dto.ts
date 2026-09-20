/**
 * Skill 更新 DTO
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSkillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ example: 'Development' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    type: String,
    description: '技能驱动指令全文',
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
