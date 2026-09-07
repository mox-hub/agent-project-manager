/**
 * MCP Servers Controller（外部 MCP server 管理）
 *
 * REST 端点（JwtAuthGuard 保护）：
 *   GET    /_api/mcp/servers              列表（配置 + 最近探活状态）
 *   POST   /_api/mcp/servers              新增（创建后立即探活）
 *   POST   /_api/mcp/servers/refresh-all  全部启用项并发探活
 *   POST   /_api/mcp/servers/:id/refresh  单个探活
 *   PUT    /_api/mcp/servers/:id          更新配置（更新后重新探活）
 *   DELETE /_api/mcp/servers/:id          删除
 *
 * 与既有 /mcp/status、/mcp/sse（本系统作为 MCP Server 对外）互不影响。
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { McpServersService, McpServerStatus } from './mcp-servers.service';
import { SaveMcpServerDto } from './dto/save-mcp-server.dto';
import {
  McpServerDeleteResponseDto,
  McpServerListResponseDto,
  McpServerStatusResponseDto,
} from './dto/mcp-response.dto';

@ApiTags('MCP Servers')
@ApiBearerAuth('JWT-auth')
@Controller('mcp/servers')
@UseGuards(JwtAuthGuard)
export class McpServersController {
  constructor(private readonly service: McpServersService) {}

  @Get()
  @ApiOperation({
    summary: 'List configured external MCP servers with cached status',
  })
  @ApiOkResponse({
    type: McpServerListResponseDto,
    description: 'MCP server list',
  })
  async listServers(): Promise<{ servers: McpServerStatus[] }> {
    return { servers: await this.service.listServers() };
  }

  @Post()
  @ApiOperation({ summary: 'Add an external MCP server (probes immediately)' })
  @ApiResponse({ status: 201, description: 'Created server with probe result' })
  @ApiCreatedResponse({ type: McpServerStatusResponseDto })
  async createServer(@Body() dto: SaveMcpServerDto): Promise<McpServerStatus> {
    return this.service.createServer(dto);
  }

  @Post('refresh-all')
  @ApiOperation({ summary: 'Probe all enabled MCP servers in parallel' })
  @ApiOkResponse({
    type: McpServerListResponseDto,
    description: 'Refreshed server list',
  })
  async refreshAll(): Promise<{ servers: McpServerStatus[] }> {
    return { servers: await this.service.refreshAllServers() };
  }

  @Post(':id/refresh')
  @ApiOperation({ summary: 'Probe a single MCP server (connect + listTools)' })
  @ApiOkResponse({
    type: McpServerStatusResponseDto,
    description: 'Server status after probe',
  })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async refreshServer(@Param('id') id: string): Promise<McpServerStatus> {
    return this.service.refreshServer(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update MCP server config (probes after update)' })
  @ApiOkResponse({
    type: McpServerStatusResponseDto,
    description: 'Updated server with probe result',
  })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async updateServer(
    @Param('id') id: string,
    @Body() dto: SaveMcpServerDto,
  ): Promise<McpServerStatus> {
    return this.service.updateServer(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an MCP server config' })
  @ApiOkResponse({
    type: McpServerDeleteResponseDto,
    description: 'Deleted（返回 { success: true }）',
  })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async deleteServer(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.service.deleteServer(id);
    return { success: true };
  }
}
