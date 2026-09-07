import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/** 记忆四类（不混装）：事实/事件在业务表（Store A），这里只存查不到的偏好与结论 */
export const MEMORY_TYPES = [
  'preference',
  'conclusion',
  'summary',
  'relationship',
  'capability',
] as const;

export const MEMORY_LIFECYCLES = [
  'working',
  'consolidated',
  'archived',
  'pruned',
] as const;

export class CreateMemoryDto {
  @ApiPropertyOptional({ description: '项目域（不传为 global 用户全局档案）' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: '记忆类型', enum: MEMORY_TYPES })
  @IsIn(MEMORY_TYPES as unknown as string[])
  type: string;

  @ApiProperty({ description: '记忆正文（原子：一条一个事实/偏好/结论）' })
  @IsString()
  @MinLength(2)
  content: string;

  @ApiPropertyOptional({ description: '置信度 0-1（默认 0.8）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({
    description: '关联实体 [{kind,id}]（task/decision/member/document...）',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          description: '实体类型：task / decision / member / document ...',
        },
        id: { type: 'string', description: '实体 ID' },
      },
      required: ['kind', 'id'],
    },
  })
  @IsOptional()
  @IsArray()
  refs?: Array<{ kind: string; id: string }>;
}

export class UpdateMemoryDto {
  @ApiPropertyOptional({ description: '置信度 0-1' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional({ description: '生命周期', enum: MEMORY_LIFECYCLES })
  @IsOptional()
  @IsIn(MEMORY_LIFECYCLES as unknown as string[])
  lifecycle?: string;

  @ApiPropertyOptional({ description: '钉住（不参与衰减/整理）' })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @ApiPropertyOptional({ description: '人工修正正文' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  content?: string;
}

export class MemoryAtomDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: '命名空间：global | project:{id}' })
  scope: string;
  @ApiProperty({ description: '记忆类型' })
  type: string;
  @ApiProperty({ description: '正文' })
  content: string;
  @ApiProperty({ description: '置信度 0-1' })
  confidence: number;
  @ApiPropertyOptional({ description: '关联实体' })
  refs?: unknown;
  @ApiPropertyOptional({ description: '溯源事件/消息 ID' })
  sourceEventId?: string;
  @ApiPropertyOptional({ description: 'digest | manual | tool' })
  sourceType?: string;
  @ApiProperty({ description: '生命周期' })
  lifecycle: string;
  @ApiProperty({ description: '是否钉住' })
  pinned: boolean;
  @ApiProperty({ description: '召回命中次数' })
  hits: number;
  @ApiPropertyOptional({ description: '最近被召回时间（ISO）' })
  lastUsedAt?: string;
  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;
}

// ============ 响应契约（HTTP 面返回形状） ============

export class MemoryBriefCountsDto {
  @ApiProperty({ description: '该 scope 记忆总数' })
  total: number;

  @ApiProperty({ description: 'working 生命周期数量' })
  working: number;
}

/** GET /memory/brief 返回（memory.service brief） */
export class MemoryBriefResponseDto {
  @ApiProperty({ description: '召回命名空间：global | project:{id}' })
  scope: string;

  @ApiProperty({
    description: '钉住的记忆（最多 5 条）',
    type: [MemoryAtomDto],
  })
  pinned: MemoryAtomDto[];

  @ApiProperty({
    description: '最新 working 记忆（最多 8 条）',
    type: [MemoryAtomDto],
  })
  recent: MemoryAtomDto[];

  @ApiProperty({ type: MemoryBriefCountsDto })
  counts: MemoryBriefCountsDto;
}

/** GET /memory 返回：{ items, total } */
export class MemoryListResponseDto {
  @ApiProperty({
    description: '记忆原子列表（含 archived，不含 pruned）',
    type: [MemoryAtomDto],
  })
  items: MemoryAtomDto[];

  @ApiProperty({ description: '符合条件的总数' })
  total: number;
}
