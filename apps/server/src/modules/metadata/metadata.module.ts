import { Module } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { MetadataController } from './metadata.controller';
import { RolesGuard } from '../../core/guards/roles.guard';

@Module({
  controllers: [MetadataController],
  providers: [MetadataService, RolesGuard],
  exports: [MetadataService],
})
export class MetadataModule {}
