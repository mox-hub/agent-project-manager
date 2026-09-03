import { Global, Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

/**
 * 通用动态追踪模块：任务 / Bug / 项目的操作记录、评论与表情回应。
 * Global 以便 task / project 等业务模块直接注入 ActivityService 落记录。
 */
@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
