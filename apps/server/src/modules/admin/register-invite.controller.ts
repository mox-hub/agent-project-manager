import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators/public.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('register-invites')
export class RegisterInviteController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: '注册邀请公开预览（邀请人/受邀邮箱/状态）' })
  @ApiResponse({ status: 200, description: '返回邀请预览' })
  async preview(@Param('token') token: string) {
    return this.adminService.previewInvite(token);
  }
}
