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
