import { LinearApiError, LinearClient } from './linear-client';

// Mock fetch globally for these tests
const originalFetch = global.fetch;

function mockFetch(
  responses: Array<{ ok?: boolean; status?: number; body?: any }>,
) {
  let i = 0;
  const fn = jest.fn(async () => {
    const r = responses[i++] ?? responses[responses.length - 1];
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'x-ratelimit-remaining' ? '100' : null,
      },
      json: async () => r.body,
    } as any;
  });
  (global as any).fetch = fn;
  return fn;
}

afterEach(() => {
  (global as any).fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('LinearClient', () => {
  it('throws if apiKey is missing', () => {
    expect(() => new LinearClient('')).toThrow(LinearApiError);
  });

  it('returns data when response is OK', async () => {
    mockFetch([
      {
        ok: true,
        body: { data: { viewer: { id: 'u1', name: 'Tester' } } },
      },
    ]);
    const client = new LinearClient('lin_api_test');
    const out = await client.request<{ viewer: { id: string } }>({
      query: 'query { viewer { id } }',
    });
    expect(out.viewer.id).toBe('u1');
  });

  it('throws on non-retryable 4xx', async () => {
    mockFetch([
      {
        ok: false,
        status: 401,
        body: { errors: [{ message: 'Unauthorized' }] },
      },
    ]);
    const client = new LinearClient('lin_api_test');
    await expect(
      client.request({ query: 'query { viewer { id } }' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('retries on 5xx then succeeds', async () => {
    const fn = mockFetch([
      { ok: false, status: 503, body: { errors: [{ message: 'Service Unavailable' }] } },
      { ok: true, body: { data: { viewer: { id: 'u2' } } } },
    ]);
    const client = new LinearClient('lin_api_test', );
    const out = await client.request<{ viewer: { id: string } }>({
      query: 'query { viewer { id } }',
    });
    expect(out.viewer.id).toBe('u2');
    // 1 failure + 1 success = at least 2 calls
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('retries on 429', async () => {
    const fn = mockFetch([
      { ok: false, status: 429, body: { errors: [{ message: 'Too Many Requests' }] } },
      { ok: true, body: { data: { viewer: { id: 'u3' } } } },
    ]);
    const client = new LinearClient('lin_api_test');
    const out = await client.request({ query: 'query { viewer { id } }' });
    expect((out as any).viewer.id).toBe('u3');
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('returns GraphQL errors when no HTTP error', async () => {
    mockFetch([
      {
        ok: true,
        body: {
          errors: [
            {
              message: 'Validation failed',
              extensions: { code: 'INVALID_INPUT' },
            },
          ],
        },
      },
    ]);
    const client = new LinearClient('lin_api_test');
    await expect(
      client.request({ query: 'query { viewer { id } }' }),
    ).rejects.toThrow(LinearApiError);
  });
});
