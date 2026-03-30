const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function parseAllowedOriginsFromEnv(
  raw = process.env.ALLOWED_ORIGINS,
): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (!origin || origin === 'null') {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return LOCALHOST_ORIGIN_REGEX.test(origin);
}
