import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { ExpertiseService } from './expertise.service';

@Module({
  controllers: [MemoryController],
  providers: [MemoryService, ExpertiseService],
  exports: [MemoryService, ExpertiseService],
})
export class MemoryModule {}
