/**
 * MCP Server Controller
 */

import { Controller, Post, Get, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { McpServerService } from './mcp-server.service';

@ApiTags('MCP Server')
@Controller('mcp')
export class McpServerController {
  constructor(private readonly mcpServer: McpServerService) {}

  @Post()
  @ApiOperation({ summary: 'MCP request endpoint' })
  @ApiResponse({ status: 200, description: 'MCP response' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async handleMcpRequest(@Body() body: any) {
    // MCP requests are handled by the MCP SDK transport
    // This endpoint is for configuration/status purposes
    return {
      status: 'ok',
      message: 'MCP Server is running',
      endpoint: '/_api/mcp',
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get MCP Server status' })
  @ApiResponse({ status: 200, description: 'MCP Server status' })
  async getStatus() {
    return {
      status: 'ready',
      version: '1.0.0',
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
      },
    };
  }
}
