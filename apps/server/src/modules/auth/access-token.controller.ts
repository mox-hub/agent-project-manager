/**
 * 访问 token（PAT）管理端点
 * 创建返回明文 token（仅此一次）；列表/吊销用于设置页 token 管理。
 */
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiStandardErrors } from '../../common/decorators/api-response.decorator';
import { AccessTokenService } from './access-token.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import {
  AccessTokenCreatedResponseDto,
  AccessTokenResponseDto,
} from './dto/access-token-response.dto';

@ApiTags('Auth')
@ApiBearerAuth('JWT-auth')
@Controller('auth/tokens')
export class AccessTokenController {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  @Post()
  @ApiOperation({ summary: '创建访问 token（明文仅本次返回）' })
  @ApiCreatedResponse({
    description: '返回完整 token 记录与明文 token（明文仅此一次）',
    type: AccessTokenCreatedResponseDto,
  })
  @ApiStandardErrors()
  create(@CurrentUser() user: any, @Body() dto: CreateAccessTokenDto) {
    return this.accessTokenService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '列出当前用户的访问 token' })
  @ApiOkResponse({
    description: '返回当前用户的 token 列表（按创建时间倒序）',
    type: AccessTokenResponseDto,
    isArray: true,
  })
  @ApiStandardErrors()
  list(@CurrentUser() user: any) {
    return this.accessTokenService.list(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '吊销访问 token' })
  @ApiOkResponse({
    description: '返回吊销后的 token 记录（已吊销时幂等返回原记录）',
    type: AccessTokenResponseDto,
  })
  @ApiStandardErrors()
  revoke(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accessTokenService.revoke(user.id, id);
  }
}
