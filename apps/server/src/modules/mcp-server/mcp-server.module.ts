/**
 * MCP Server Module
 *
 * - McpServerController/Service：本系统作为 MCP Server 对外（SSE JSON-RPC）
 * - McpServersController/Service + McpClientRegistry：外部 MCP server 接入管理
 */

import { Module } from '@nestjs/common';
import { McpServerService } from './mcp-server.service';
import { McpServerController } from './mcp-server.controller';
import { McpConfigGenerator } from './mcp-config.generator';
import { McpServersController } from './mcp-servers.controller';
import { McpServersService } from './mcp-servers.service';
import { McpClientRegistry } from './mcp-client.registry';
import { TaskModule } from '@/modules/task/task.module';
import { ExecutionModule } from '@/modules/execution/execution.module';
import { CliDispatchModule } from '@/modules/cli-dispatch/cli-dispatch.module';
import { CliProviderModule } from '@/modules/cli-provider/cli-provider.module';

@Module({
  imports: [TaskModule, ExecutionModule, CliDispatchModule, CliProviderModule],
  controllers: [McpServerController, McpServersController],
  providers: [
    McpServerService,
    McpConfigGenerator,
    McpServersService,
    McpClientRegistry,
  ],
  exports: [McpServerService, McpConfigGenerator, McpServersService],
})
export class McpServerModule {}
