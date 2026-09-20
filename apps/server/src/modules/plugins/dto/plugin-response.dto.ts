import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 插件权限项（PluginPermission） */
export class PluginPermissionItemDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String, description: '插件 ID' })
  pluginId: string;
  @ApiProperty({ type: String, description: '权限标识' })
  permission: string;
  @ApiProperty({ type: Boolean, description: '是否已授予' })
  granted: boolean;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
}

/** 插件（Plugin，详情含权限列表） */
export class PluginResponseDto {
  @ApiProperty({ type: String }) id: string;
  @ApiProperty({ type: String }) name: string;
  @ApiProperty({ type: String, description: '版本' })
  version: string;
  @ApiPropertyOptional({ type: String, nullable: true, description: '描述' })
  description?: string | null;
  @ApiProperty({
    description: '插件清单',
    type: Object,
    additionalProperties: true,
  })
  manifest: Record<string, unknown>;
  @ApiProperty({ type: Boolean, description: '是否启用' })
  enabled: boolean;
  @ApiPropertyOptional({
    description: '插件配置',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  config?: Record<string, unknown> | null;
  @ApiPropertyOptional({
    description: '附加元数据',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;
  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;
  @ApiPropertyOptional({
    type: [PluginPermissionItemDto],
    description: '权限列表（findById 详情返回，列表接口不含）',
  })
  permissions?: PluginPermissionItemDto[];
}

/** GET /plugins 返回（{ data, meta } 分页口径） */
export class PluginListResponseDto {
  @ApiProperty({ type: [PluginResponseDto], description: '插件列表' })
  data: PluginResponseDto[];

  @ApiProperty({
    description: '分页元信息',
    type: 'object',
    properties: {
      page: { type: 'number', description: '页码' },
      pageSize: { type: 'number', description: '每页数量' },
      total: { type: 'number', description: '总数' },
    },
    required: ['page', 'pageSize', 'total'],
  })
  meta: { page: number; pageSize: number; total: number };
}
