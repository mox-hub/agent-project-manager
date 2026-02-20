import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

/**
 * Custom rate limit guard that provides better error messages
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected errorMessage = 'Too many requests';
}
