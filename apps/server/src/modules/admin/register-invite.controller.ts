import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@/common/decorators/public.decorator';
import { AdminService } from './admin.service';
import { RegisterInvitePreviewDto } from './dto/admin-response.dto';

@ApiTags('Admin')
@Controller('register-invites')
export class RegisterInviteController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: '注册邀请公开预览（邀请人/受邀邮箱/状态）' })
  @ApiOkResponse({
    type: RegisterInvitePreviewDto,
    description: '邀请预览 { inviterName, email, status, expiresAt }',
  })
  async preview(@Param('token') token: string) {
    return this.adminService.previewInvite(token);
  }
}
