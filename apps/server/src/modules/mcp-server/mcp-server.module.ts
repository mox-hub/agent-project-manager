/**
 * MCP Server Module
 */

import { Module } from '@nestjs/common';
import { McpServerService } from './mcp-server.service';
import { McpServerController } from './mcp-server.controller';
import { McpConfigGenerator } from './mcp-config.generator';
import { TaskModule } from '@/modules/task/task.module';
import { ExecutionModule } from '@/modules/execution/execution.module';
import { CliDispatchModule } from '@/modules/cli-dispatch/cli-dispatch.module';

@Module({
  imports: [TaskModule, ExecutionModule, CliDispatchModule],
  controllers: [McpServerController],
  providers: [McpServerService, McpConfigGenerator],
  exports: [McpServerService, McpConfigGenerator],
})
export class McpServerModule {}
