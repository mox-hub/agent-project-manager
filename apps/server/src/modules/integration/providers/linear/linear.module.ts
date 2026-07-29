import { Module } from '@nestjs/common';
import { LinearController } from './linear.controller';
import { LinearSyncService } from './linear-sync.service';
import { LinearProviderService } from './linear-provider.service';

@Module({
  controllers: [LinearController],
  providers: [LinearSyncService, LinearProviderService],
  exports: [LinearSyncService, LinearProviderService],
})
export class LinearModule {}
