import { BadRequestException } from '@nestjs/common';
import { parseFilterQuery } from './filter-query.util';

describe('parseFilterQuery', () => {
  it('should return empty object when raw is undefined', () => {
    expect(parseFilterQuery(undefined, ['status'])).toEqual({});
  });

  it('should parse valid filters', () => {
    expect(
      parseFilterQuery(JSON.stringify({ status: ['active'], type: ['team'] }), [
        'status',
        'type',
      ]),
    ).toEqual({
      status: ['active'],
      type: ['team'],
    });
  });

  it('should throw when key is not allowed', () => {
    expect(() =>
      parseFilterQuery(JSON.stringify({ unknown: ['x'] }), ['status']),
    ).toThrow(BadRequestException);
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseFilterQuery('{bad-json', ['status'])).toThrow(
      BadRequestException,
    );
  });

  it('should throw on non-string value entries', () => {
    expect(() =>
      parseFilterQuery(JSON.stringify({ status: [1] }), ['status']),
    ).toThrow(BadRequestException);
  });
});
