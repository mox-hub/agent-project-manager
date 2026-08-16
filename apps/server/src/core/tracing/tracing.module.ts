import { Module, Global } from '@nestjs/common';
import {
  TraceContextService,
  TraceMiddleware,
  traceMiddlewareFactory,
} from './trace-context.service';
import { TraceInterceptor } from './trace.interceptor';

@Global()
@Module({
  providers: [TraceContextService, TraceInterceptor],
  exports: [TraceContextService, TraceInterceptor],
})
export class TracingModule {
  static forRoot() {
    return {
      module: TracingModule,
      providers: [TraceContextService, TraceInterceptor],
      exports: [TraceContextService, TraceInterceptor],
    };
  }
}

export { TraceContextService, TraceContext } from './trace-context.service';
export { TraceInterceptor } from './trace.interceptor';
