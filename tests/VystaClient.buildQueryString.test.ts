import { VystaClient } from '../src/VystaClient';

describe('VystaClient.buildQueryString', () => {
  const makeClient = () =>
    new VystaClient({
      baseUrl: 'http://example',
      storage: {
        setToken: () => {},
        getToken: () => null,
        clearTokens: () => {},
      },
    });

  test('encodes ampersand in eq value', () => {
    const client = makeClient();
    const qs = (client as any).buildQueryString({
      filters: { name: { eq: 'Ruihua Pulp & Paper Co., LTD.' } },
      limit: 1,
    });
    expect(qs).toContain('name=eq.Ruihua%20Pulp%20%26%20Paper%20Co.%2C%20LTD.');
    expect(qs).toContain('limit=1');
  });

  test('encodes arrays element-wise for in operator', () => {
    const client = makeClient();
    const qs = (client as any).buildQueryString({
      filters: { code: { in: ['A&B', 'C,D', 'E F'] } },
    });
    expect(qs).toBe('?code=in.A%26B,C%2CD,E%20F');
  });

  test('encodes other special characters in eq', () => {
    const client = makeClient();
    const qs = (client as any).buildQueryString({
      filters: { q: { eq: '50% off + free #1' } },
    });
    expect(qs).toBe('?q=eq.50%25%20off%20%2B%20free%20%231');
  });
});
