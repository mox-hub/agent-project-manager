import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { InviteService } from './invite.service';

class AcceptInviteDto {
  @IsOptional()
  @IsString()
  displayName?: string;
}

@ApiTags('Invites')
@Controller('invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: '邀请公开预览（团队名/角色/状态）' })
  @ApiResponse({ status: 200, description: '返回邀请预览' })
  async preview(@Param('token') token: string) {
    return this.inviteService.preview(token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':token/accept')
  @ApiOperation({ summary: '接受邀请（登录邮箱须匹配）' })
  @ApiResponse({ status: 201, description: '已加入团队' })
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: { id: string },
    @Body() _dto: AcceptInviteDto,
  ) {
    return this.inviteService.accept(token, user.id);
  }
}
