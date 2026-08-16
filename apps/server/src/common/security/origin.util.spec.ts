import { isAllowedOrigin, parseAllowedOriginsFromEnv } from './origin.util';

describe('origin util', () => {
  it('should parse comma separated origins', () => {
    expect(
      parseAllowedOriginsFromEnv('http://localhost:3000, https://example.com'),
    ).toEqual(['http://localhost:3000', 'https://example.com']);
  });

  it('should allow localhost origin even when env list is empty', () => {
    expect(isAllowedOrigin('http://127.0.0.1:4300', [])).toBe(true);
    expect(isAllowedOrigin('http://localhost:5173', [])).toBe(true);
  });

  it('should deny non-whitelisted non-local origins', () => {
    expect(isAllowedOrigin('https://evil.example.com', [])).toBe(false);
  });
});
