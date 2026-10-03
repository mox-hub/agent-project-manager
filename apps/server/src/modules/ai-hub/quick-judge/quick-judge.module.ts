import { Module } from '@nestjs/common';
import { QuickJudgeService } from './quick-judge.service';
import { QuickJudgeSettingsService } from './quick-judge-settings.service';
import { CryptoModule } from '@/core/crypto/crypto.module';

/**
 * quick-judge 判断通道（CAP-A-27）：独立轻模块——只依赖基础设施（Prisma/Logger
 * 全局 + CryptoModule），不 import 任何业务模块，execution/acceptance 可无环引入。
 * advisory 语义：判断结果只展示不拦截，消费方在 judge 返回 null 时回落规则层。
 */
@Module({
  imports: [CryptoModule],
  providers: [QuickJudgeService, QuickJudgeSettingsService],
  exports: [QuickJudgeService, QuickJudgeSettingsService],
})
export class QuickJudgeModule {}
