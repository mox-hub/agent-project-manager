import { Module } from '@nestjs/common';
import { ContractEngineService } from './contract-engine.service';
import { ContractBindingService } from './contract-binding.service';
import { ContractSeedService } from './contract-seed.service';
import { ContractProjectSubscriber } from './contract-project.subscriber';
import { ContractExecutionSubscriber } from './contract-execution.subscriber';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceResolver,
  LocalWorkspaceFs,
} from './contract-workspace-fs';

/**
 * 契约绑定域（契约与文档知识层 v2 纪要切片 1a）。
 * V1 无 REST 面：引擎/绑定/种生均为服务层能力，经 project.created
 * （种生）与 runtime.execution.result（对齐节拍）事件驱动；API 面
 * 随冲突裁决 UI 开放。
 */
@Module({
  providers: [
    ContractEngineService,
    { provide: CONTRACT_WORKSPACE_FS, useClass: LocalWorkspaceFs },
    ContractWorkspaceResolver,
    ContractBindingService,
    ContractSeedService,
    ContractProjectSubscriber,
    ContractExecutionSubscriber,
  ],
  exports: [ContractEngineService, ContractBindingService, ContractSeedService],
})
export class ContractModule {}
