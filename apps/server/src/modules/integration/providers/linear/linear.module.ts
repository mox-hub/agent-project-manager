import { Module } from '@nestjs/common';
import { LinearController } from './linear.controller';
import { LinearSyncService } from './linear-sync.service';
import { LinearSDKService } from './linear-sdk.service';
import { TaskModule } from '../../../task/task.module';

@Module({
  imports: [TaskModule],
  controllers: [LinearController],
  providers: [LinearSyncService, LinearSDKService],
  exports: [LinearSyncService, LinearSDKService],
})
export class LinearModule {}
