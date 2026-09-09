import { Module } from '@nestjs/common';
import { ContractEngineService } from './contract-engine.service';
import { ContractBindingService } from './contract-binding.service';
import { ContractSeedService } from './contract-seed.service';
import { ContractController } from './contract.controller';
import { ContractProjectSubscriber } from './contract-project.subscriber';
import { ContractExecutionSubscriber } from './contract-execution.subscriber';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceResolver,
  LocalWorkspaceFs,
} from './contract-workspace-fs';

/**
 * 契约绑定域（契约与文档知识层 v2 纪要切片 1a + 三期种生实机入口）。
 * 事件驱动节拍：project.created（种生）、runtime.execution.result（对齐）。
 * REST 面（/projects/:id/contract/*）供 init 页/设置绑定面板人工显式
 * 种生、对齐检查与三态切换；冲突裁决仍走 DecisionProposal 收件箱。
 */
@Module({
  controllers: [ContractController],
  providers: [
    ContractEngineService,
    { provide: CONTRACT_WORKSPACE_FS, useClass: LocalWorkspaceFs },
    ContractWorkspaceResolver,
    ContractBindingService,
    ContractSeedService,
    ContractProjectSubscriber,
    ContractExecutionSubscriber,
  ],
  exports: [
    ContractEngineService,
    ContractBindingService,
    ContractSeedService,
    ContractWorkspaceResolver,
    CONTRACT_WORKSPACE_FS,
  ],
})
export class ContractModule {}
