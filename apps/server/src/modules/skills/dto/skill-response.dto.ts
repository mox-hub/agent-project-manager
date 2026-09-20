import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** skills.service SkillStatus */
export class SkillStatusResponseDto {
  @ApiProperty({ description: '技能唯一 key' })
  key: string;

  @ApiProperty({ description: '技能名' })
  name: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ description: '分类（Development / Management ...）' })
  category: string;

  @ApiProperty({ description: '来源', enum: ['builtin', 'custom'] })
  source: 'builtin' | 'custom';

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}

/** GET /skills 返回：{ skills } */
export class SkillListResponseDto {
  @ApiProperty({ type: [SkillStatusResponseDto] })
  skills: SkillStatusResponseDto[];
}

/** GET /skills/:key 返回：含指令正文与来源路径的全量形态 */
export class SkillDetailResponseDto extends SkillStatusResponseDto {
  @ApiPropertyOptional({
    type: String,
    description: '技能驱动指令全文',
  })
  content?: string;

  @ApiPropertyOptional({
    type: String,
    description: '导入来源的本地 SKILL.md 路径',
  })
  sourcePath?: string;
}

/** DELETE /skills/:key 返回 */
export class SkillDeleteResponseDto {
  @ApiProperty({ description: '被删除的技能 key' })
  key: string;

  @ApiProperty({ description: '删除成功' })
  deleted: boolean;
}
