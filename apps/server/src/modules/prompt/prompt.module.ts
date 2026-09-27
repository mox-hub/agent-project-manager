/**
 * Prompt Module（CAP-A-24 提示词治理 + 增强 A/C/D）
 *
 * imports ContractModule：复用契约引擎托管区块原语（applyManagedBlocks/
 * compareManagedBlocks）与工作区根解析（ContractWorkspaceResolver）——
 * AGENTS.md 物化与契约种子同文件多区块共存，同一引擎单一解析实现。
 */

import { Module } from '@nestjs/common';
import { ContractModule } from '@/modules/contract/contract.module';
import { PromptAgentsSyncService } from './prompt-agents-sync.service';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';

@Module({
  imports: [ContractModule],
  controllers: [PromptController],
  providers: [PromptService, PromptAgentsSyncService],
  exports: [PromptService],
})
export class PromptModule {}
