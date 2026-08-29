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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  CreateAdminUserDto,
  CreateRegistrationInviteDto,
  UpdateAdminUserDto,
} from './dto/admin.dto';

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
  @ApiResponse({ status: 200, description: '返回账号列表' })
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Post('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '直接创建成员账号（随机初始密码仅本次返回）' })
  @ApiResponse({ status: 201, description: '账号已创建' })
  @ApiResponse({ status: 409, description: '邮箱已注册' })
  async createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '编辑账号（资料/停用启用/重置密码）' })
  @ApiResponse({ status: 200, description: '账号已更新' })
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
  @ApiResponse({ status: 200, description: '返回邀请列表' })
  async listInvites() {
    return this.adminService.listInvites();
  }

  @Post('invites')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建注册邀请（有邮箱时发 Outbox 邮件）' })
  @ApiResponse({ status: 201, description: '邀请已创建' })
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
  @ApiResponse({ status: 201, description: '邀请已撤销' })
  async revokeInvite(@Param('id') id: string) {
    return this.adminService.revokeInvite(id);
  }
}
