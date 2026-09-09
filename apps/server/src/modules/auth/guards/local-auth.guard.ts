import { Injectable, Optional } from '@nestjs/common';
import { AuthGuard, AuthModuleOptions } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  // Nest 12 注入器不再跨原型链继承 passport mixin 基类的 @Optional() 水印；
  // 显式构造器把可选依赖声明落到本类元数据，AuthModuleOptions 缺省时注入 undefined
  constructor(@Optional() options?: AuthModuleOptions) {
    super(options);
  }
}
