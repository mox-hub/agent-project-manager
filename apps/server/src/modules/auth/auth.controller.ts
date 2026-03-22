import {
  Controller,
  Delete,
  Post,
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
import { Public } from '../../core/decorators/public.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { CreateAgentIdentityBindingDto } from './dto/create-agent-identity-binding.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiResponse({ status: 200, description: 'Returns current user subject claim' })
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
