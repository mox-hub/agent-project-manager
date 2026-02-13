import { Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../../core/decorators/public.decorator';
import { PrismaService } from '../../core/database/prisma.service';

@Controller('auth/oauth2')
export class OAuth2Controller {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('providers')
  async getProviders() {
    const providers = await this.prisma.oAuth2Provider.findMany({
      where: { enabled: true },
      select: {
        id: true,
        name: true,
        enabled: true,
      },
    });

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      provider: p.name.toLowerCase().replace(/\s+/g, '-'),
      enabled: p.enabled,
    }));
  }

  @Public()
  @Get('authorize')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async authorize(@Query('provider') _provider?: string) {
    // Phase 1: 最小骨架，返回未实现
    return {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'OAuth2 authorization flow will be implemented in Phase 7',
      },
    };
  }

  @Public()
  @Get('callback')
  async callback() {
    // Phase 1: 最小骨架，返回未实现
    return {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'OAuth2 callback flow will be implemented in Phase 7',
      },
    };
  }

  @Public()
  @Post('logout')
  async logout() {
    // Phase 1: 最小骨架，返回未实现
    return {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'OAuth2 logout flow will be implemented in Phase 7',
      },
    };
  }
}
