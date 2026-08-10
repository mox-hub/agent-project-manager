import { Module } from '@nestjs/common';
import { LinearController } from './linear.controller';
import { LinearSyncService } from './linear-sync.service';
import { LinearSDKService } from './linear-sdk.service';

@Module({
  controllers: [LinearController],
  providers: [LinearSyncService, LinearSDKService],
  exports: [LinearSyncService, LinearSDKService],
})
export class LinearModule {}
