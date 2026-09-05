import { Injectable } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 限流配额支持环境变量覆盖：
 * 本地 dev / E2E 全量跑会产生远超默认值的请求量（前端每页聚合查询 + 用例造数），
 * 未调高时会在运行中大量 429，表现为页面"假死"。生产不配置则走以下默认值。
 */
const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const THROTTLE_SHORT_LIMIT = toInt(process.env.THROTTLE_SHORT_LIMIT, 60);
const THROTTLE_MEDIUM_LIMIT = toInt(process.env.THROTTLE_MEDIUM_LIMIT, 500);
const THROTTLE_LONG_LIMIT = toInt(process.env.THROTTLE_LONG_LIMIT, 2000);

/**
 * Throttler module configuration
 * Export the forRoot options for use in AppModule
 */
export const throttlerConfig = ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 60000, // 1 minute
    limit: THROTTLE_SHORT_LIMIT,
  },
  {
    name: 'medium',
    ttl: 3600000, // 1 hour
    limit: THROTTLE_MEDIUM_LIMIT,
  },
  {
    name: 'long',
    ttl: 86400000, // 24 hours
    limit: THROTTLE_LONG_LIMIT,
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
