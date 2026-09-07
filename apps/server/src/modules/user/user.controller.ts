import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { UserService } from './user.service';
import {
  RoleAssignmentDto,
  UserResponseDto,
  UserSearchItemDto,
} from './dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('search')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '按邮箱/用户名检索用户（本地直邀用）' })
  @ApiOkResponse({
    type: [UserSearchItemDto],
    description: '匹配用户列表（不含 timezone/createdAt）',
  })
  @ApiStandardErrors()
  search(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.userService.search(q ?? '', limit ? Number(limit) : 20);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ type: [UserResponseDto], description: '用户列表' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiOkResponse({ type: UserResponseDto, description: '用户详情' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiStandardErrors()
  findOne(@Param('userId') userId: string) {
    return this.userService.findOne(userId);
  }

  @Get(':userId/roles')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiOkResponse({
    type: [RoleAssignmentDto],
    description: '用户角色分配列表（时间倒序）',
  })
  @ApiStandardErrors()
  getUserRoles(@Param('userId') userId: string) {
    return this.userService.getRoles(userId);
  }

  @Post(':userId/roles')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Add role to user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scopeType: { type: 'string', example: 'global' },
        projectId: { type: 'string', example: 'project-123' },
        role: { type: 'string', example: 'developer' },
      },
      required: ['scopeType', 'role'],
    },
  })
  @ApiOkResponse({
    type: RoleAssignmentDto,
    description: '新建的角色分配',
  })
  @ApiStandardErrors()
  addUserRole(
    @Param('userId') userId: string,
    @Body() body: { scopeType: string; projectId?: string; role: string },
  ) {
    return this.userService.addRole(userId, body);
  }

  @Delete(':userId/roles/:roleAssignmentId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'roleAssignmentId', description: 'Role assignment ID' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeUserRole(
    @Param('userId') userId: string,
    @Param('roleAssignmentId') roleAssignmentId: string,
  ) {
    return this.userService.removeRole(userId, roleAssignmentId);
  }
}
