import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './core/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
