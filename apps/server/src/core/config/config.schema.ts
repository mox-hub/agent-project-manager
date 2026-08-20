import * as Joi from 'joi';

export const configSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4300),
  ALLOWED_ORIGINS: Joi.string().optional(),
  FRONTEND_DIST_DIR: Joi.string().optional(),
  APP_MODE: Joi.string()
    .valid('standalone', 'server', 'client')
    .default('standalone'),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_TYPE: Joi.string().valid('sqlite', 'postgresql').default('sqlite'),

  // Auth
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // OAuth2 (optional)
  OAUTH2_PROVIDERS: Joi.string().optional(), // JSON string

  // 公开访问地址（邀请链接拼接用，默认本地开发前端）
  APP_PUBLIC_URL: Joi.string().default('http://localhost:5173'),

  // Mail (optional, SMTP 未配置时 Outbox 仅落库待发)
  MAIL_SMTP_HOST: Joi.string().optional(),
  MAIL_SMTP_PORT: Joi.number().default(587),
  MAIL_SMTP_USER: Joi.string().optional(),
  MAIL_SMTP_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().default('APM <no-reply@apm.local>'),

  // AI (optional)
  AI_OPENAI_API_KEY: Joi.string().optional(),
  AI_ANTHROPIC_API_KEY: Joi.string().optional(),
  AI_DEFAULT_MODEL: Joi.string().default('gpt-4o'),

  // Uploads
  UPLOAD_DIR: Joi.string().default('./uploads'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
});
