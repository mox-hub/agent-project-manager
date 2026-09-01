/**
 * 访问 token（PAT）全局模块。
 *
 * JwtAuthGuard 经 APP_GUARD 在每个模块上下文实例化，
 * AccessTokenService 需全局可注入，故独立成 @Global 模块。
 */
import { Global, Module } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';

@Global()
@Module({
  providers: [AccessTokenService],
  exports: [AccessTokenService],
})
export class AccessTokenModule {}
