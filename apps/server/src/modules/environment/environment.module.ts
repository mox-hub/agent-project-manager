/**
 * Environment Module（2026-10-03 引导改版切片）
 *
 * 轻量聚合：本地基础环境（node/git + 四个 AI CLI）的确定性探测。
 * 依赖 CliProviderModule 复用其 detectAll（DB commandPath 覆盖参与判定），
 * 自身不落库、零状态。
 */

import { Module } from '@nestjs/common';
import { CliProviderModule } from '@/modules/cli-provider/cli-provider.module';
import { EnvironmentController } from './environment.controller';
import { EnvironmentService } from './environment.service';

@Module({
  imports: [CliProviderModule],
  controllers: [EnvironmentController],
  providers: [EnvironmentService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
