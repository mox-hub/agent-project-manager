/**
 * Environment Module（2026-10-03 引导改版切片；CAP-A-30 扩按需安装）
 *
 * 轻量聚合：本地基础环境（node/git + 四个 AI CLI）的确定性探测 + npm 系
 * AI CLI 按需安装作业（白名单 + 受控 prefix，作业在内存）。
 * 依赖 CliProviderModule 复用其 detectAll（DB commandPath 覆盖参与判定），
 * 自身不落库。
 */

import { Module } from '@nestjs/common';
import { CliProviderModule } from '@/modules/cli-provider/cli-provider.module';
import { EnvironmentController } from './environment.controller';
import { EnvironmentService } from './environment.service';
import { EnvironmentInstallService } from './environment-install.service';

@Module({
  imports: [CliProviderModule],
  controllers: [EnvironmentController],
  providers: [EnvironmentService, EnvironmentInstallService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
