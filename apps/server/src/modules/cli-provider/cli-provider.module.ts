/**
 * CLI Provider Module
 *
 * 提供 CLI Provider 检索与配置的 REST 服务
 * - 依赖 CliProviderRegistry 读取内置 adapter 状态
 * - 依赖 Prisma 读写 CliProviderConfig 表
 */

import { Module } from '@nestjs/common';
import { CliProviderService } from './cli-provider.service';
import { CliProviderController } from './cli-provider.controller';
import { CliDispatchModule } from '@/modules/cli-dispatch/cli-dispatch.module';

@Module({
  imports: [CliDispatchModule],
  controllers: [CliProviderController],
  providers: [CliProviderService],
  exports: [CliProviderService],
})
export class CliProviderModule {}
