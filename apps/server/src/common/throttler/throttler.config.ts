import { Injectable } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Throttler module configuration
 * Export the forRoot options for use in AppModule
 */
export const throttlerConfig = ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 60000, // 1 minute
    limit: 60, // 60 requests per minute
  },
  {
    name: 'medium',
    ttl: 3600000, // 1 hour
    limit: 500, // 500 requests per hour
  },
  {
    name: 'long',
    ttl: 86400000, // 24 hours
    limit: 2000, // 2000 requests per day
  },
]);

/**
 * Custom rate limit exception for better error messages
 */
export class RateLimitException extends HttpException {
  constructor(limit: number, ttl: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Too many requests. Maximum ${limit} requests per ${ttl / 1000} seconds.`,
        error: 'Rate limit exceeded',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
