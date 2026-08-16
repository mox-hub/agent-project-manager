import { Controller, Get, Post, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { OAuth2Service } from './oauth2.service';
import { AuthService } from './auth.service';

@ApiTags('OAuth2')
@Controller('auth/oauth2')
export class OAuth2Controller {
  constructor(
    private readonly oauth2Service: OAuth2Service,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'Get OAuth2 providers' })
  @ApiResponse({ status: 200, description: 'Returns list of OAuth2 providers' })
  async getProviders() {
    return await this.oauth2Service.getProviders();
  }

  @Public()
  @Get('authorize')
  @ApiOperation({ summary: 'OAuth2 authorization endpoint' })
  @ApiQuery({
    name: 'provider',
    required: true,
    description: 'OAuth2 provider (github, gitlab, etc.)',
  })
  @ApiQuery({
    name: 'redirect_uri',
    required: true,
    description: 'Redirect URI after authorization',
  })
  @ApiResponse({ status: 200, description: '返回授权 URL' })
  async authorize(
    @Query('provider') provider: string,
    @Query('redirect_uri') redirectUri: string,
  ) {
    const authUrl = await this.oauth2Service.getAuthorizationUrl(
      provider,
      redirectUri,
    );
    return { authUrl };
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'OAuth2 callback endpoint' })
  @ApiQuery({
    name: 'provider',
    required: true,
    description: 'OAuth2 provider',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'OAuth2 authorization code',
  })
  @ApiQuery({
    name: 'state',
    required: true,
    description: 'OAuth2 state parameter',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功，返回 accessToken 和用户信息',
  })
  @ApiResponse({ status: 400, description: 'OAuth2 state / code 校验失败' })
  @ApiResponse({ status: 404, description: 'OAuth2 provider 未找到' })
  async callback(
    @Query('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Request() req: any,
  ) {
    // 失败分支已由 service 抛出 BadRequestException / BusinessException
    const { userId } = await this.oauth2Service.handleCallback(
      provider,
      code,
      state,
    );

    const loginResult = await this.authService.loginByUserId(userId, {
      identitySource: 'oauth2',
      providerId: provider,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });

    return {
      userId,
      ...loginResult,
    };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'OAuth2 logout endpoint' })
  @ApiQuery({
    name: 'account_id',
    required: true,
    description: 'OAuth2 account ID',
  })
  async logout(@Query('account_id') accountId: string) {
    const userId = 'temp-user-id';

    await this.oauth2Service.disconnectAccount(accountId, userId);

    return { disconnected: true };
  }
}
