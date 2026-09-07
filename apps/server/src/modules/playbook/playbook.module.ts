import { Module } from '@nestjs/common';
import { PlaybookController } from './playbook.controller';
import { PlaybookService } from './playbook.service';
import { DocumentModule } from '@/modules/document/document.module';
import { DecisionModule } from '@/modules/decision/decision.module';
import { MemoryModule } from '@/modules/memory/memory.module';

/**
 * 剧本（v2 纪要 §3.4）：模板 = 代码内置注册表；实例 = Project 游标字段
 * + 活动事件派生时间线。产出工件走 DocumentService，闸门走 ProposalService，
 * 知识原子落 MemoryService（Store B）——本模块不承载拍板语义。
 */
@Module({
  imports: [DocumentModule, DecisionModule, MemoryModule],
  controllers: [PlaybookController],
  providers: [PlaybookService],
  exports: [PlaybookService],
})
export class PlaybookModule {}
