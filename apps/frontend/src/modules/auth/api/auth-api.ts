import { api } from '@/infrastructure/api-client';

export interface LoginRequest {
  username: string;
  password: string;
}

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

export interface UpdateProfileRequest {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  timezone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
  inviteToken?: string;
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
