import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Returns list of users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns user details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('userId') userId: string) {
    return this.userService.findOne(userId);
  }

  @Get(':userId/roles')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns user roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserRoles(@Param('userId') userId: string) {
    return this.userService.getRoles(userId);
  }

  @Post(':userId/roles')
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
  @ApiResponse({ status: 200, description: 'Role added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addUserRole(
    @Param('userId') userId: string,
    @Body() body: { scopeType: string; projectId?: string; role: string },
  ) {
    return this.userService.addRole(userId, body);
  }

  @Delete(':userId/roles/:roleAssignmentId')
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
