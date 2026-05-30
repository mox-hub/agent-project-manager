import { Module } from '@nestjs/common';
import { TrustService } from './trust.service';

@Module({
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}
