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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiStandardErrors } from '../../common/decorators/api-response.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  LoginResponseDto,
  CurrentUserResponseDto,
  LogoutResponseDto,
  ChangePasswordResponseDto,
  PublicConfigResponseDto,
  AuthSessionDto,
  SubjectClaimResponseDto,
} from './dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: '邮箱注册（创建 User + human Member 并登录，支持邀请 token）',
  })
  @ApiCreatedResponse({
    description: '注册成功，返回登录态',
    type: LoginResponseDto,
  })
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
  @ApiOkResponse({
    description: '返回部署模式与注册策略',
    type: PublicConfigResponseDto,
  })
  async publicConfig() {
    return this.authService.getPublicConfig();
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login successful, returns JWT token and user info',
    type: LoginResponseDto,
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
  @ApiOkResponse({ description: 'Logout successful', type: LogoutResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    description: 'Returns current user with roles',
    type: CurrentUserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getCurrentUserWithRoles(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '更新个人资料（昵称/邮箱/头像/时区）' })
  @ApiOkResponse({
    description: '返回更新后的当前用户（含角色）',
    type: CurrentUserResponseDto,
  })
  @ApiResponse({ status: 409, description: '邮箱已被使用' })
  @ApiStandardErrors()
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '修改密码（校验当前密码，吊销其他会话）' })
  @ApiOkResponse({
    description: '密码已更新',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({ status: 400, description: '当前密码不正确' })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    description: 'Returns current user sessions（按最近活跃倒序）',
    type: AuthSessionDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    description: 'Returns current user subject claim',
    type: SubjectClaimResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiStandardErrors()
  async getCurrentSubjectClaim(@CurrentUser() user: any) {
    return this.authService.getCurrentSubjectClaim(user.id);
  }
}
