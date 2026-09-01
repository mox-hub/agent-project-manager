/**
 * 访问 token（PAT）管理端点
 * 创建返回明文 token（仅此一次）；列表/吊销用于设置页 token 管理。
 */
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenService } from './access-token.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';

@ApiTags('Auth')
@ApiBearerAuth('JWT-auth')
@Controller('auth/tokens')
export class AccessTokenController {
  constructor(private readonly accessTokenService: AccessTokenService) {}

  @Post()
  @ApiOperation({ summary: '创建访问 token（明文仅本次返回）' })
  create(@CurrentUser() user: any, @Body() dto: CreateAccessTokenDto) {
    return this.accessTokenService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: '列出当前用户的访问 token' })
  list(@CurrentUser() user: any) {
    return this.accessTokenService.list(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '吊销访问 token' })
  revoke(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accessTokenService.revoke(user.id, id);
  }
}
