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

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get<CurrentUserResponse>('/auth/me'),
  getOAuth2Providers: () => api.get('/auth/oauth2/providers'),
};
