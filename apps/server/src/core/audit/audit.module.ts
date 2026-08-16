import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

// Re-export the service for convenience
export { AuditService } from './audit.service';
export * from './audit.service';
