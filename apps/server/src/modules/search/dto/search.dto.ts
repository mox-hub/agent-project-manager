import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsNumber, IsOptional, IsString } from 'class-validator';

/** 后端最小实现的搜索类别（前端契约另含 milestone/acceptance，命中为空即自然分组为空） */
export type SearchCategory = 'task' | 'bug' | 'document' | 'project';

/** 前端契约（search-api.ts SearchResultType）全量：未实现类别命中为空而非 400 */
const FRONTEND_CONTRACT_TYPES = [
  'task',
  'bug',
  'document',
  'project',
  'milestone',
  'acceptance',
] as const;

export class SearchQueryDto {
  @ApiProperty({
    description:
      '搜索关键词（title/shortId/description/name contains，大小写不敏感）',
  })
  @IsString()
  q!: string;

  @ApiPropertyOptional({
    description:
      '类型过滤，可省略；可重复传（types=task&types=bug）或数组风格（types[]=task）；' +
      'milestone/acceptance 为前端契约保留类别，后端暂不产出命中（返回空分组）',
    enum: FRONTEND_CONTRACT_TYPES,
    type: [String],
    isArray: true,
    required: false,
  })
  // 数组元素不逐项校验（未知类别由 service 过滤为空命中），仅放行
  @IsOptional()
  @Allow()
  types?: string | string[];

  /**
   * axios 默认把数组序列化为 types[]=a&types[]=b（方括号键）；全局
   * ValidationPipe whitelist 会丢弃未声明属性，故显式声明此兼容键。
   * 不加 @ApiProperty，不进 OpenAPI 文档。
   */
  @IsOptional()
  @Allow()
  'types[]'?: string | string[];

  @ApiPropertyOptional({
    description: '每类返回上限（默认 10，封顶 10）',
    type: Number,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class SearchHitDto {
  @ApiProperty({ description: '命中对象 ID' })
  id: string;

  @ApiProperty({
    description: '命中类别',
    enum: ['task', 'bug', 'document', 'project'],
  })
  type: SearchCategory;

  @ApiProperty({ description: '标题' })
  title: string;

  @ApiProperty({ description: '副标题（展示用：项目/编号/状态摘要）' })
  subtitle: string;

  @ApiProperty({ description: '前端路由路径（/app/...）' })
  path: string;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '所属项目 ID（项目命中时为 null）',
    nullable: true,
  })
  projectId: string | null;
}

export class SearchResponseDto {
  @ApiProperty({
    description: '扁平命中列表（前端按 type 分组渲染）',
    type: [SearchHitDto],
  })
  items: SearchHitDto[];

  @ApiProperty({ description: '命中总数（= items.length）' })
  total: number;
}
