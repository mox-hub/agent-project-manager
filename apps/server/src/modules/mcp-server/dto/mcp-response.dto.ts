import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** GET /mcp/status 返回 */
export class McpCapabilitiesDto {
  @ApiProperty({ description: '是否支持 tools' })
  tools: boolean;

  @ApiProperty({ description: '是否支持 resources' })
  resources: boolean;

  @ApiProperty({ description: '是否支持 prompts' })
  prompts: boolean;
}

export class McpStatusResponseDto {
  @ApiProperty({ description: '服务状态', example: 'ready' })
  status: string;

  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: McpCapabilitiesDto })
  capabilities: McpCapabilitiesDto;

  @ApiProperty({ description: '活跃 MCP session 数' })
  activeSessions: number;
}

/** mcp-servers.service McpServerStatus（外部 MCP server 配置 + 最近探活状态） */
export class McpServerStatusResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: '唯一名称' })
  name: string;

  @ApiPropertyOptional({ type: String })
  description?: string;

  @ApiProperty({ description: '传输方式', enum: ['stdio', 'http', 'sse'] })
  transport: 'stdio' | 'http' | 'sse';

  @ApiPropertyOptional({ description: 'stdio 启动命令' })
  command?: string;

  @ApiPropertyOptional({ description: 'stdio 启动参数', type: [String] })
  args?: string[];

  @ApiPropertyOptional({
    description: '子进程环境变量',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  env?: Record<string, string>;

  @ApiPropertyOptional({ description: 'http/sse 端点 URL' })
  url?: string;

  @ApiPropertyOptional({
    description: 'http/sse 请求头',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  headers?: Record<string, string>;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({
    description: '最近探活状态',
    enum: ['online', 'offline', 'unknown'],
  })
  status: 'online' | 'offline' | 'unknown';

  @ApiPropertyOptional({ description: '最近探活错误信息' })
  lastError?: string;

  @ApiPropertyOptional({ description: '探活发现的 tools 数' })
  toolCount?: number;

  @ApiPropertyOptional({ description: '最近探活延迟（ms）' })
  lastLatencyMs?: number;

  @ApiPropertyOptional({ description: '最近探活时间（ISO）' })
  lastPingAt?: string;

  @ApiPropertyOptional({ description: '对端 server 名（探活元数据）' })
  serverName?: string;

  @ApiPropertyOptional({ description: '对端 server 版本（探活元数据）' })
  serverVersion?: string;

  @ApiProperty({ description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO）' })
  updatedAt: string;
}

/** GET /mcp/servers、POST /mcp/servers/refresh-all 返回：{ servers } */
export class McpServerListResponseDto {
  @ApiProperty({ type: [McpServerStatusResponseDto] })
  servers: McpServerStatusResponseDto[];
}

/** DELETE /mcp/servers/:id 返回 */
export class McpServerDeleteResponseDto {
  @ApiProperty({ description: '删除成功' })
  success: boolean;
}
