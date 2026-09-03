/**
 * 外部 MCP Server 配置 DTO（创建 / 更新共用）
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export const MCP_TRANSPORTS = ['stdio', 'http', 'sse'] as const;
export type McpTransport = (typeof MCP_TRANSPORTS)[number];

export class SaveMcpServerDto {
  @ApiProperty({ example: 'filesystem' })
  @IsString()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ example: 'Local filesystem access' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ enum: MCP_TRANSPORTS, example: 'stdio' })
  @IsIn(MCP_TRANSPORTS)
  transport!: McpTransport;

  @ApiPropertyOptional({ example: 'npx' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  command?: string;

  @ApiPropertyOptional({
    example: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  args?: string[];

  @ApiPropertyOptional({ example: { DEBUG: '1' } })
  @IsOptional()
  @IsObject()
  env?: Record<string, string>;

  @ApiPropertyOptional({ example: 'https://mcp.example.com/mcp' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiPropertyOptional({ example: { Authorization: 'Bearer xxx' } })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
