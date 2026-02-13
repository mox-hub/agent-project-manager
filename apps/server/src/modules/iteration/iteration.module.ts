import { Module } from '@nestjs/common';
import { IterationController } from './iteration.controller';
import { IterationService } from './iteration.service';

@Module({
  controllers: [IterationController],
  providers: [IterationService],
  exports: [IterationService],
})
export class IterationModule {}
