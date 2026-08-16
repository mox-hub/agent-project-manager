import { BadRequestException } from '@nestjs/common';

export type ParsedFilterMap = Record<string, string[]>;

export function parseFilterQuery(
  raw: string | undefined,
  allowedKeys: readonly string[],
): ParsedFilterMap {
  if (!raw) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException(
      'Invalid filters query: filters must be a valid JSON object',
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestException(
      'Invalid filters query: filters must be a JSON object',
    );
  }

  const allowed = new Set(allowedKeys);
  const result: ParsedFilterMap = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (!allowed.has(key)) {
      throw new BadRequestException(`Unknown filter key: ${key}`);
    }

    const values = Array.isArray(value) ? value : [value];
    const normalized = values.map((entry) => {
      if (typeof entry !== 'string') {
        throw new BadRequestException(
          `Invalid filter value for "${key}": expected string array`,
        );
      }
      const trimmed = entry.trim();
      if (!trimmed) {
        throw new BadRequestException(
          `Invalid filter value for "${key}": empty string is not allowed`,
        );
      }
      return trimmed;
    });

    if (normalized.length > 0) {
      result[key] = Array.from(new Set(normalized));
    }
  }

  return result;
}
