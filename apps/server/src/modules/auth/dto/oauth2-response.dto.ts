import { ApiProperty } from '@nestjs/swagger';
import {
  LoginSessionDto,
  AuthUserDto,
  SubjectClaimResponseDto,
} from './auth-response.dto';

/** GET auth/oauth2/providers 返回的已启用提供方 */
export class OAuth2ProviderResponseDto {
  @ApiProperty({ description: '提供方 ID（github / gitlab …）' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  enabled: boolean;
}

/** GET auth/oauth2/authorize 返回 */
export class OAuth2AuthorizeResponseDto {
  @ApiProperty({ description: 'OAuth2 提供方授权页 URL（携带 state）' })
  authUrl: string;
}

/** GET auth/oauth2/callback 返回：OAuth2 登录成功后的登录态（含用户 ID） */
export class OAuth2CallbackResponseDto {
  @ApiProperty({ description: '创建或关联后的用户 ID' })
  userId: string;

  @ApiProperty({ description: 'JWT 访问令牌' })
  accessToken: string;

  @ApiProperty({ type: LoginSessionDto })
  session: LoginSessionDto;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ type: SubjectClaimResponseDto })
  subjectClaim: SubjectClaimResponseDto;
}

/** POST auth/oauth2/logout 返回 */
export class OAuth2DisconnectResponseDto {
  @ApiProperty({ example: true })
  disconnected: boolean;
}
