import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class JudgeAcceptanceProbabilityDto {
  @ApiPropertyOptional({
    description: '只判这些标准（缺省判整张验收单的全部标准）',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @IsString({ each: true })
  criteriaIds?: string[];
}

export class CriteriaProbabilityItemDto {
  @ApiProperty() criteriaId!: string;
  @ApiProperty({
    description:
      '预估达成概率 0-100；判断通道不可用/场景禁用时 null（前端整块隐藏）',
    nullable: true,
  })
  probability!: number | null;
  @ApiProperty({
    description: '判定置信度 0-1；noul/score 无置信字段时 null',
    nullable: true,
  })
  confidence!: number | null;
  @ApiProperty({ description: '是否命中内容指纹缓存（未重复调用判断通道）' })
  cached!: boolean;
  @ApiProperty({
    description: '判定模型（缓存命中时为落账版本）',
    nullable: true,
  })
  model?: string;
}

export class AcceptanceProbabilityResponseDto {
  @ApiProperty({ type: [CriteriaProbabilityItemDto] })
  items!: CriteriaProbabilityItemDto[];
  @ApiProperty({
    description: '本次判定模型（全部命中缓存时缺省）',
    nullable: true,
  })
  model?: string;
}
