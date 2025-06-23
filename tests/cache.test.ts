import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { VystaClient } from '../src/VystaClient.js';
import { VystaReadonlyService } from '../src/base/VystaReadonlyService.js';

interface Row { id: number }

class TestService extends VystaReadonlyService<Row> {
  constructor(client: VystaClient) {
    super(client, 'TestConn', 'TestEntity');
  }

  protected override hydrate(row: Row): Row {
    return row;
  }
}

describe('Vysta cache layer', () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  let fetchSpy: any;
  let client: VystaClient;
  let service: TestService;

  beforeEach(() => {
    // Mock global fetch
    // @ts-ignore
    fetchSpy = jest.fn().mockImplementation((url: string) => {
      const isAggregate = url.endsWith('/query');

      let data: any[] = [];
      let headers = new Map<string, string>();

      if (isAggregate) {
        // Return a single-row aggregate result
        data = [{ avgUnitPrice: 10, totalUnitsInStock: 100 }];
      } else {
        const u = new URL(url);
        const offset = Number(u.searchParams.get('offset') || '0');
        const limit = Number(u.searchParams.get('limit') || '50');
        data = Array.from({ length: limit }, (_, i) => ({ id: offset + i }));
        headers.set('Recordcount', '77');
      }

      return Promise.resolve({
        ok: true,
        json: async () => data,
        headers: {
          get: (name: string) => headers.get(name) || null,
        },
      });
    });
    // @ts-ignore
    global.fetch = fetchSpy;

    client = new VystaClient({ baseUrl: 'http://localhost', debug: false });
    // @ts-ignore  bypass auth headers
    client.auth.getAuthHeaders = async () => ({});

    service = new TestService(client);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('single call cached on second hit', async () => {
    await service.getAll({ limit: 20, offset: 0, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.getAll({ limit: 20, offset: 0, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no additional fetch
  });

  test('range merge caching', async () => {
    await service.getAll({ limit: 20, offset: 0, useCache: true });
    await service.getAll({ limit: 20, offset: 20, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await service.getAll({ limit: 40, offset: 0, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2); // hit from merged range
  });

  test('different select produces new cache key', async () => {
    await service.getAll({ select: ['id'], limit: 10, useCache: true });
    await service.getAll({ select: ['id'], limit: 10, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.getAll({ select: { id: 'alias' }, limit: 10, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2); // new key triggers fetch
  });

  test('refreshCache invalidates', async () => {
    await service.getAll({ limit: 10, useCache: true });
    await service.getAll({ limit: 10, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.refreshCache();
    await service.getAll({ limit: 10, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('aggregate query caches single-row result', async () => {
    await service.query({ select: [{ name: 'id', aggregate: 'AVG', alias: 'avgId' }] as any, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.query({ select: [{ name: 'id', aggregate: 'AVG', alias: 'avgId' }] as any, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // cached hit, no extra fetch
  });

  test('order direction creates new cache entry', async () => {
    await service.getAll({ order: { id: 'asc' }, limit: 5, useCache: true });
    await service.getAll({ order: { id: 'asc' }, limit: 5, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.getAll({ order: { id: 'desc' }, limit: 5, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('inputProperties changes create new cache entry', async () => {
    await service.query({ inputProperties: { foo: 'a' }, useCache: true });
    await service.query({ inputProperties: { foo: 'a' }, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.query({ inputProperties: { foo: 'b' }, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('conditions value change creates new cache entry', async () => {
    const baseCond = (val: string) => [{ column: 'name', comparisonOperator: 'Like', values: [val] } as any];

    await service.query({ conditions: baseCond('Bon%'), useCache: true });
    await service.query({ conditions: baseCond('Bon%'), useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.query({ conditions: baseCond('Q%'), useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('zero-row result caches correctly', async () => {
    // mock fetch to return empty data for next call
    fetchSpy.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        json: async () => [],
        headers: { get: () => '0' },
      });
    });
    await service.getAll({ limit: 10, useCache: true }); // MISS fetches 0 rows
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.getAll({ limit: 10, useCache: true }); // should HIT cache even though empty
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('cache can be disabled per request', async () => {
    // First call should not cache (cache is opt-in)
    await service.getAll({ limit: 10 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call without cache should fetch again
    await service.getAll({ limit: 10 });
    expect(fetchSpy).toHaveBeenCalledTimes(2); // fetches again

    // Third call with cache enabled should cache
    await service.getAll({ limit: 10, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3); // fetches again

    // Fourth call with cache enabled should hit cache
    await service.getAll({ limit: 10, useCache: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3); // uses cache from third call

    // Fifth call with cache disabled should fetch again
    await service.getAll({ limit: 10, useCache: false });
    expect(fetchSpy).toHaveBeenCalledTimes(4); // fetches again
  });
}); 