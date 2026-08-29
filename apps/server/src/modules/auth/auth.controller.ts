import {
  Controller,
  Delete,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAgentIdentityBindingDto } from './dto/create-agent-identity-binding.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: '邮箱注册（创建 User + human Member 并登录，支持邀请 token）',
  })
  @ApiResponse({ status: 201, description: '注册成功，返回登录态' })
  @ApiResponse({ status: 409, description: '邮箱已注册 / 注册已关闭' })
  async register(@Body() dto: RegisterDto, @Request() req: any) {
    return this.authService.register(dto, {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Public()
  @Get('public-config')
  @ApiOperation({ summary: '公开配置：部署模式与注册策略' })
  async publicConfig() {
    return this.authService.getPublicConfig();
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token and user info',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() _loginDto: LoginDto, @Request() req: any) {
    return this.authService.loginByUserId(req.user.id, {
      identitySource: 'local',
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: any, @Query('all') all?: string) {
    return this.authService.logout(
      user.id,
      user.sessionId,
      all === 'true' || all === '1',
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user with roles',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getCurrentUserWithRoles(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '更新个人资料（昵称/邮箱/头像/时区）' })
  @ApiResponse({ status: 200, description: '返回更新后的当前用户（含角色）' })
  @ApiResponse({ status: 409, description: '邮箱已被使用' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '修改密码（校验当前密码，吊销其他会话）' })
  @ApiResponse({ status: 200, description: '密码已更新' })
  @ApiResponse({ status: 400, description: '当前密码不正确' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto, user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user sessions' })
  @ApiResponse({ status: 200, description: 'Returns current user sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentSessions(@CurrentUser() user: any) {
    return this.authService.listSessions(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:sessionId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke one session of current user' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeOneSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: any,
  ) {
    return this.authService.revokeSession(user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subject-claim')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current subject claim' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user subject claim',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentSubjectClaim(@CurrentUser() user: any) {
    return this.authService.getCurrentSubjectClaim(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/:projectId/agent-bindings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List project agent identity bindings' })
  @ApiResponse({
    status: 200,
    description: 'Returns project agent identity bindings',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listProjectAgentBindings(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.authService.listAgentIdentityBindings(projectId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('projects/:projectId/agent-bindings')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create or update project agent identity binding' })
  @ApiBody({ type: CreateAgentIdentityBindingDto })
  @ApiResponse({
    status: 200,
    description: 'Returns the upserted project agent identity binding',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async upsertProjectAgentBinding(
    @Param('projectId') projectId: string,
    @Body() dto: CreateAgentIdentityBindingDto,
    @CurrentUser() user: any,
  ) {
    return this.authService.upsertAgentIdentityBinding(projectId, dto, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('projects/:projectId/agent-bindings/:bindingId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete project agent identity binding' })
  @ApiResponse({ status: 200, description: 'Binding deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteProjectAgentBinding(
    @Param('projectId') projectId: string,
    @Param('bindingId') bindingId: string,
    @CurrentUser() user: any,
  ) {
    return this.authService.deleteAgentIdentityBinding(
      projectId,
      bindingId,
      user.id,
    );
  }
}
