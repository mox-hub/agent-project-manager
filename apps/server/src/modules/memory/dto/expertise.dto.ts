import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/** 档位信号（v2 纪要 §2.1 静默学习）：ignored=折叠忽略；asked=主动追问；suppress=别再解释这类；reset=恢复 */
export const EXPERTISE_SIGNALS = [
  'ignored',
  'asked',
  'suppress',
  'reset',
] as const;

export class ExpertiseFeedbackDto {
  @ApiProperty({ description: '专长度领域（剧本/决策卡 domain）' })
  @IsString()
  @MinLength(1)
  domain: string;

  @ApiProperty({ description: '学习信号', enum: EXPERTISE_SIGNALS })
  @IsIn(EXPERTISE_SIGNALS as unknown as string[])
  signal: string;

  @ApiPropertyOptional({ description: '触发场景备注（可空）' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class ExpertiseDomainDto {
  @ApiProperty({ description: '领域 key' })
  domain: string;

  @ApiProperty({
    description:
      '解释密度：detailed=完整知识夹层；terse=只给术语索引；suppressed=不解释',
    enum: ['detailed', 'terse', 'suppressed'],
  })
  level: 'detailed' | 'terse' | 'suppressed';

  @ApiProperty({ type: Number, description: '连续忽略次数（≥3 自动降密度）' })
  ignoreCount: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: '最近信号时间（ISO）',
  })
  updatedAt?: string;
}

export class ExpertiseResponseDto {
  @ApiProperty({
    type: [ExpertiseDomainDto],
    description: '各领域档位（无记录=默认 detailed）',
  })
  domains: ExpertiseDomainDto[];
}
