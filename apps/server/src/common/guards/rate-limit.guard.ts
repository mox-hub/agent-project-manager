import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom rate limit guard that provides better error messages
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected errorMessage = 'Too many requests';
}
