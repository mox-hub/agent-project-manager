import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { AdminService } from './admin.service';
import {
  CreateAdminUserDto,
  CreateRegistrationInviteDto,
  UpdateAdminUserDto,
} from './dto/admin.dto';
import {
  AdminUserCreateResponseDto,
  AdminUserListItemDto,
  AdminUserUpdateResponseDto,
  RegistrationInviteDto,
  RegistrationInviteListItemDto,
} from './dto/admin-response.dto';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '账号列表（含全局角色与关联 Member）' })
  @ApiOkResponse({
    type: [AdminUserListItemDto],
    description: '账号列表（含全局角色与 Member 投影）',
  })
  @ApiStandardErrors()
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '直接创建成员账号（随机初始密码仅本次返回）' })
  @ApiCreatedResponse({
    type: AdminUserCreateResponseDto,
    description: '账号摘要 + Member ID + 初始密码',
  })
  @ApiResponse({ status: 409, description: '邮箱已注册' })
  @ApiStandardErrors()
  async createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '编辑账号（资料/停用启用/重置密码）' })
  @ApiOkResponse({
    type: AdminUserUpdateResponseDto,
    description: '更新后的账号摘要（重置密码时含 generatedPassword）',
  })
  @ApiStandardErrors()
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.updateUser(id, dto, req.user.id);
  }

  @Get('invites')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '注册邀请列表' })
  @ApiOkResponse({
    type: [RegistrationInviteListItemDto],
    description: '邀请列表（pending 且过期派生为 expired）',
  })
  @ApiStandardErrors()
  async listInvites() {
    return this.adminService.listInvites();
  }

  @Post('invites')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建注册邀请（有邮箱时发 Outbox 邮件）' })
  @ApiCreatedResponse({
    type: RegistrationInviteDto,
    description: '新创建的注册邀请',
  })
  @ApiStandardErrors()
  async createInvite(
    @Body() dto: CreateRegistrationInviteDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.adminService.createInvite(dto, req.user.id);
  }

  @Post('invites/:id/revoke')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '撤销注册邀请' })
  @ApiCreatedResponse({
    type: RegistrationInviteDto,
    description: '撤销后的邀请（status=revoked）',
  })
  @ApiStandardErrors()
  async revokeInvite(@Param('id') id: string) {
    return this.adminService.revokeInvite(id);
  }
}
