import { api } from '@/infrastructure/api-client';
import type { RequestBodyOf } from '@/infrastructure/api-client/contract';

/**
 * 请求体类型单源于 openapi 契约（components.schemas 的 DTO），响应体
 * 在服务端补 @ApiOkResponse 之前仍维持手写 interface。
 */
export type LoginRequest = RequestBodyOf<'AuthController_login'>;
export type RegisterRequest = RequestBodyOf<'AuthController_register'>;
export type UpdateProfileRequest = RequestBodyOf<'AuthController_updateProfile'>;
export type ChangePasswordRequest = RequestBodyOf<'AuthController_changePassword'>;

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
    timezone?: string;
  };
}

export interface CurrentUserResponse {
  user: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
    timezone?: string;
  };
  roles: Array<{
    id: string;
    scopeType: string;
    projectId?: string;
    role: string;
  }>;
}

export interface InvitePreview {
  teamName: string;
  teamAvatar: string | null;
  inviterName: string;
  role: string;
  email: string;
  status: string;
  expiresAt: string;
}

export interface RegisterInvitePreview {
  inviterName: string;
  email: string | null;
  status: string;
  expiresAt: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) =>
    api.post<LoginResponse>('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get<CurrentUserResponse>('/auth/me'),
  updateProfile: (data: UpdateProfileRequest) =>
    api.patch<CurrentUserResponse>('/auth/me', data),
  changePassword: (data: ChangePasswordRequest) =>
    api.patch<{ ok: boolean }>('/auth/me/password', data),
  getOAuth2Providers: () => api.get('/auth/oauth2/providers'),
  getPublicConfig: () =>
    api.get<{ appMode: string; registrationMode: string }>('/auth/public-config'),
  previewInvite: (token: string) =>
    api.get<InvitePreview>(`/invites/${token}`),
  previewRegisterInvite: (token: string) =>
    api.get<RegisterInvitePreview>(`/register-invites/${token}`),
  acceptInvite: (token: string) => api.post(`/invites/${token}/accept`, {}),
};
