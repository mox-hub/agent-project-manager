import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { TracingModule } from '../tracing/tracing.module';

@Global()
@Module({
  imports: [TracingModule],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
