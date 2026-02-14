import { Module } from '@nestjs/common';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';

@Module({
  controllers: [IntegrationController],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
