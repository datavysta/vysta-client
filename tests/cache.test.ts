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

    client = new VystaClient({ baseUrl: 'http://localhost', cache: true, debug: false });
    // @ts-ignore  bypass auth headers
    client.auth.getAuthHeaders = async () => ({});

    service = new TestService(client);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('single call cached on second hit', async () => {
    await service.getAll({ limit: 20, offset: 0 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.getAll({ limit: 20, offset: 0 });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // no additional fetch
  });

  test('range merge caching', async () => {
    await service.getAll({ limit: 20, offset: 0 });
    await service.getAll({ limit: 20, offset: 20 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await service.getAll({ limit: 40, offset: 0 });
    expect(fetchSpy).toHaveBeenCalledTimes(2); // hit from merged range
  });

  test('different select produces new cache key', async () => {
    await service.getAll({ select: ['id'], limit: 10 });
    await service.getAll({ select: ['id'], limit: 10 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.getAll({ select: { id: 'alias' }, limit: 10 });
    expect(fetchSpy).toHaveBeenCalledTimes(2); // new key triggers fetch
  });

  test('refreshCache invalidates', async () => {
    await service.getAll({ limit: 10 });
    await service.getAll({ limit: 10 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.refreshCache();
    await service.getAll({ limit: 10 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('aggregate query caches single-row result', async () => {
    await service.query({ select: [{ name: 'id', aggregate: 'AVG', alias: 'avgId' }] as any });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.query({ select: [{ name: 'id', aggregate: 'AVG', alias: 'avgId' }] as any });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // cached hit, no extra fetch
  });

  test('order direction creates new cache entry', async () => {
    await service.getAll({ order: { id: 'asc' }, limit: 5 });
    await service.getAll({ order: { id: 'asc' }, limit: 5 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.getAll({ order: { id: 'desc' }, limit: 5 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('inputProperties changes create new cache entry', async () => {
    await service.query({ inputProperties: { foo: 'a' } });
    await service.query({ inputProperties: { foo: 'a' } });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.query({ inputProperties: { foo: 'b' } });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test('conditions value change creates new cache entry', async () => {
    const baseCond = (val: string) => [{ column: 'name', comparisonOperator: 'Like', values: [val] } as any];

    await service.query({ conditions: baseCond('Bon%') });
    await service.query({ conditions: baseCond('Bon%') });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await service.query({ conditions: baseCond('Q%') });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
}); 