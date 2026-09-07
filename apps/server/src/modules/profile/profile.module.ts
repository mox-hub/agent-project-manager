import { Module, forwardRef } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ArchaeologyService } from './archaeology.service';
import { ArchaeologyAutoIngestSubscriber } from './archaeology-auto-ingest.subscriber';
import { IssueModule } from '@/modules/issue/issue.module';
import { CliDispatchModule } from '@/modules/cli-dispatch/cli-dispatch.module';

/**
 * 项目档案（v2 纪要切片 1-2）：槽位注册表 + MemoryAtom 档案原子 + 考古导入
 * + 推式消化订阅器（考古执行完成自动 ingest）。复用 memory 模块的存储层
 * （MemoryAtom + slot 列），不新建实体族。
 */
@Module({
  imports: [IssueModule, forwardRef(() => CliDispatchModule)],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    ArchaeologyService,
    ArchaeologyAutoIngestSubscriber,
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
