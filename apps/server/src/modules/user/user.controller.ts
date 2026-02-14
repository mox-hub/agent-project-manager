import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':userId')
  findOne(@Param('userId') userId: string) {
    return this.userService.findOne(userId);
  }

  @Get(':userId/roles')
  getUserRoles(@Param('userId') userId: string) {
    return this.userService.getRoles(userId);
  }

  @Post(':userId/roles')
  addUserRole(
    @Param('userId') userId: string,
    @Body() body: { scopeType: string; projectId?: string; role: string },
  ) {
    return this.userService.addRole(userId, body);
  }

  @Delete(':userId/roles/:roleAssignmentId')
  removeUserRole(
    @Param('userId') userId: string,
    @Param('roleAssignmentId') roleAssignmentId: string,
  ) {
    return this.userService.removeRole(userId, roleAssignmentId);
  }
}

