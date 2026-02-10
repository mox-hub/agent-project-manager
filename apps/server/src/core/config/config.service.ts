import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  get<T = unknown>(key: string): T | undefined {
    return this.nestConfigService.get<T>(key);
  }

  getOrThrow<T = unknown>(key: string): T {
    const value = this.nestConfigService.get<T>(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" is required but not set`);
    }
    return value;
  }

  get nodeEnv(): 'development' | 'production' | 'test' {
    return (this.get('NODE_ENV') ?? 'development') as 'development' | 'production' | 'test';
  }

  get port(): number {
    return Number(this.get('PORT') ?? 4300);
  }

  get databaseUrl(): string {
    return this.getOrThrow('DATABASE_URL');
  }

  get jwtSecret(): string {
    return this.getOrThrow('JWT_SECRET');
  }
}

