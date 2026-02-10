import * as Joi from 'joi';

export const configSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4300),
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

  // AI (optional)
  AI_OPENAI_API_KEY: Joi.string().optional(),
  AI_ANTHROPIC_API_KEY: Joi.string().optional(),
  AI_DEFAULT_MODEL: Joi.string().default('gpt-4o'),

  // Uploads
  UPLOAD_DIR: Joi.string().default('./uploads'),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
});

