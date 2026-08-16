import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../core/config/config.service';

@Injectable()
export class CsrfConfig {
  constructor(private readonly configService: ConfigService) {}

  getCsrfOptions() {
    return {
      secret: this.configService.jwtSecret || 'default-csrf-secret',
      salt: 'csrf-salt',
      cookieName: '_csrf',
      cookieOptions: {
        httpOnly: true,
        secure: this.configService.nodeEnv === 'production',
        sameSite: 'strict',
      },
    };
  }
}
