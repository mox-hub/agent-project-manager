/**
 * Skill 本地路径导入 DTO：读 SKILL.md 物化 content 入库，路径留档 sourcePath
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ImportSkillDto {
  @ApiProperty({ description: '本地 SKILL.md 文件路径' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  sourcePath!: string;

  @ApiPropertyOptional({
    type: String,
    description: '技能 key；缺省时从路径派生（目录名/文件名 kebab 化）',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'key 只能含小写字母、数字与连字符',
  })
  @MaxLength(64)
  key?: string;

  @ApiPropertyOptional({
    type: String,
    description: '缺省时取 frontmatter.name 或 key',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  name?: string;

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
}
