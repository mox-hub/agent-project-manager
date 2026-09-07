import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { InviteService } from './invite.service';
import {
  InviteAcceptResponseDto,
  InvitePreviewResponseDto,
} from './dto/invite-response.dto';

class AcceptInviteDto {
  @ApiPropertyOptional({ description: '接受邀请时自定义的显示名' })
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
  @ApiOkResponse({
    type: InvitePreviewResponseDto,
    description: '返回邀请预览',
  })
  async preview(@Param('token') token: string) {
    return this.inviteService.preview(token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post(':token/accept')
  @ApiOperation({ summary: '接受邀请（登录邮箱须匹配）' })
  @ApiResponse({ status: 201, description: '已加入团队' })
  @ApiCreatedResponse({ type: InviteAcceptResponseDto })
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: { id: string },
    @Body() _dto: AcceptInviteDto,
  ) {
    return this.inviteService.accept(token, user.id);
  }
}
