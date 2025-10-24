import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { VystaClient } from '../src/VystaClient.js';
import { ETagCache } from '../src/etag/ETagCache.js';
import type { GetResponse } from '../src/VystaClient.js';

interface Product {
  id: number;
  name: string;
  categoryId: number;
}

describe('ETagCache', () => {
  let cache: ETagCache;

  beforeEach(() => {
    cache = new ETagCache({ enabled: true, maxCacheSize: 10 });
  });

  describe('Cache Key Generation', () => {
    it('should generate same key for same query parameters', () => {
      const params1 = { filters: { categoryId: { eq: 1 } }, order: { name: 'asc' as const } };
      const params2 = { filters: { categoryId: { eq: 1 } }, order: { name: 'asc' as const } };

      const key1 = cache.generateCacheKey('Northwinds', 'Products', params1);
      const key2 = cache.generateCacheKey('Northwinds', 'Products', params2);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different query parameters', () => {
      const params1 = { filters: { categoryId: { eq: 1 } } };
      const params2 = { filters: { categoryId: { eq: 2 } } };

      const key1 = cache.generateCacheKey('Northwinds', 'Products', params1);
      const key2 = cache.generateCacheKey('Northwinds', 'Products', params2);

      expect(key1).not.toBe(key2);
    });

    it('should handle parameter order differences correctly', () => {
      const params1 = { filters: { categoryId: { eq: 1 } }, limit: 10 };
      const params2 = { limit: 10, filters: { categoryId: { eq: 1 } } };

      const key1 = cache.generateCacheKey('Northwinds', 'Products', params1);
      const key2 = cache.generateCacheKey('Northwinds', 'Products', params2);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different endpoints', () => {
      const params = { filters: { id: { eq: 1 } } };

      const key1 = cache.generateCacheKey('Northwinds', 'Products', params);
      const key2 = cache.generateCacheKey('Northwinds', 'Customers', params);

      expect(key1).not.toBe(key2);
    });
  });

  describe('Cache Storage and Retrieval', () => {
    it('should store and retrieve cache entries', () => {
      const key = cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 1 } } });
      const data = { data: [{ id: 1, name: 'Product 1', categoryId: 1 }] };

      cache.set(key, 'etag123', data);
      const entry = cache.get(key);

      expect(entry).not.toBeNull();
      expect(entry?.etag).toBe('etag123');
      expect(entry?.data).toEqual(data);
    });

    it('should return null for non-existent cache entries', () => {
      const key = cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 999 } } });
      const entry = cache.get(key);

      expect(entry).toBeNull();
    });

    it('should track hits and misses', () => {
      const key = cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 1 } } });
      
      cache.get(key); // Miss
      cache.set(key, 'etag123', { data: [] });
      cache.get(key); // Hit
      cache.get(key); // Hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when cache is full', () => {
      const smallCache = new ETagCache({ enabled: true, maxCacheSize: 3 });

      // Fill cache
      const key1 = smallCache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 1 } } });
      const key2 = smallCache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 2 } } });
      const key3 = smallCache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 3 } } });

      smallCache.set(key1, 'etag1', { data: [] });
      smallCache.set(key2, 'etag2', { data: [] });
      smallCache.set(key3, 'etag3', { data: [] });

      expect(smallCache.size()).toBe(3);

      // Access key2 to make it recently used
      smallCache.get(key2);

      // Add new entry - should evict key1 (least recently used)
      const key4 = smallCache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 4 } } });
      smallCache.set(key4, 'etag4', { data: [] });

      expect(smallCache.size()).toBe(3);
      expect(smallCache.get(key1)).toBeNull(); // Evicted
      expect(smallCache.get(key2)).not.toBeNull(); // Still there (recently accessed)
      expect(smallCache.get(key3)).not.toBeNull(); // Still there
      expect(smallCache.get(key4)).not.toBeNull(); // Newly added
    });
  });

  describe('Cache Clearing', () => {
    beforeEach(() => {
      cache.set(
        cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 1 } } }),
        'etag1',
        { data: [] }
      );
      cache.set(
        cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 2 } } }),
        'etag2',
        { data: [] }
      );
      cache.set(
        cache.generateCacheKey('Northwinds', 'Customers', { filters: { id: { eq: 1 } } }),
        'etag3',
        { data: [] }
      );
    });

    it('should clear specific cache entry', () => {
      const key = cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 1 } } });
      cache.clear(key);

      expect(cache.get(key)).toBeNull();
      expect(cache.size()).toBe(2);
    });

    it('should clear cache by pattern', () => {
      cache.clearByPattern('Northwinds:Products:');

      const key1 = cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 1 } } });
      const key2 = cache.generateCacheKey('Northwinds', 'Products', { filters: { id: { eq: 2 } } });
      const key3 = cache.generateCacheKey('Northwinds', 'Customers', { filters: { id: { eq: 1 } } });

      expect(cache.get(key1)).toBeNull();
      expect(cache.get(key2)).toBeNull();
      expect(cache.get(key3)).not.toBeNull();
      expect(cache.size()).toBe(1);
    });

    it('should clear all cache entries', () => {
      cache.clearAll();

      expect(cache.size()).toBe(0);
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should calculate hit rate correctly', () => {
      const key = cache.generateCacheKey('Northwinds', 'Products', {});
      
      cache.set(key, 'etag123', { data: [] });
      cache.get(key); // Hit
      cache.get(key); // Hit
      cache.get('nonexistent'); // Miss
      cache.get('nonexistent2'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should return 0 hit rate when no requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Disabled Cache', () => {
    it('should not store or retrieve when disabled', () => {
      const disabledCache = new ETagCache({ enabled: false });
      const key = disabledCache.generateCacheKey('Northwinds', 'Products', {});

      disabledCache.set(key, 'etag123', { data: [] });
      const entry = disabledCache.get(key);

      expect(entry).toBeNull();
      expect(disabledCache.size()).toBe(0);
    });
  });
});

describe('VystaClient ETag Integration', () => {
  let client: VystaClient;
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = jest.fn();
    (global as any).fetch = mockFetch;

    client = new VystaClient({
      baseUrl: 'https://api.example.com',
      etag: { enabled: true, maxCacheSize: 100 },
    });

    // Mock auth to return simple headers
    const mockAuth: any = {
      getAuthHeaders: (jest.fn() as any).mockResolvedValue({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      }),
      login: jest.fn(),
      logout: jest.fn(),
      getSignInMethods: jest.fn(),
      getAuthorizeUrl: jest.fn(),
      handleAuthenticationRedirect: jest.fn(),
      exchangeToken: jest.fn(),
      getUserProfile: jest.fn(),
      forgotPassword: jest.fn(),
      validateCode: jest.fn(),
      changePassword: jest.fn(),
      acceptInvitation: jest.fn(),
      validateInvitation: jest.fn(),
      setHost: jest.fn(),
      getAvailableEnvironments: jest.fn(),
      switchEnvironment: jest.fn(),
      constructAuthenticationRedirectUrl: jest.fn(),
      getCurrentEnvironmentInfo: jest.fn(),
    };
    (client as any).auth = mockAuth;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET with ETag Support', () => {
    it('should store ETag on first request', async () => {
      const mockData = [{ id: 1, name: 'Product 1', categoryId: 1 }];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag123'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData,
      } as any);

      const result = await client.get<Product>('rest/connections/Northwinds/tables/Products');

      expect(result.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const stats = client.getETagCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should send If-None-Match on subsequent request', async () => {
      const mockData = [{ id: 1, name: 'Product 1', categoryId: 1 }];
      
      // First request - 200 with ETag
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag123'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData,
      } as any);

      await client.get<Product>('rest/connections/Northwinds/tables/Products');

      // Second request - should include If-None-Match
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 304,
        headers: new Map([['ETag', 'etag123']]),
      } as any);

      const result2 = await client.get<Product>('rest/connections/Northwinds/tables/Products');

      expect(result2.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      const secondCallHeaders = (mockFetch.mock.calls[1] as any)[1].headers;
      expect(secondCallHeaders['If-None-Match']).toBe('etag123');

      const stats = client.getETagCacheStats();
      expect(stats.hits).toBe(1); // Second request hit
      expect(stats.misses).toBe(1); // First request miss (no cache yet)
    });

    it('should handle 304 response correctly', async () => {
      const mockData = [{ id: 1, name: 'Product 1', categoryId: 1 }];
      
      // First request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag123'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData,
      } as any);

      const result1 = await client.get<Product>('rest/connections/Northwinds/tables/Products');
      expect(result1.data).toEqual(mockData);

      // Second request - 304
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 304,
        headers: new Map([['ETag', 'etag123']]),
      } as any);

      const result2 = await client.get<Product>('rest/connections/Northwinds/tables/Products');
      expect(result2.data).toEqual(mockData);
      
      // Should only have called json() once (on first request)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle different queries separately', async () => {
      const mockData1 = [{ id: 1, name: 'Product 1', categoryId: 1 }];
      const mockData2 = [{ id: 2, name: 'Product 2', categoryId: 2 }];
      
      // First query
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag1'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData1,
      } as any);

      await client.get<Product>('rest/connections/Northwinds/tables/Products', {
        filters: { categoryId: { eq: 1 } },
      });

      // Second query (different filter)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag2'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData2,
      } as any);

      await client.get<Product>('rest/connections/Northwinds/tables/Products', {
        filters: { categoryId: { eq: 2 } },
      });

      const stats = client.getETagCacheStats();
      expect(stats.size).toBe(2); // Two different cache entries
    });

    it('should handle 304 without cached data gracefully', async () => {
      const mockData = [{ id: 1, name: 'Product 1', categoryId: 1 }];
      
      // First request returns 304 (shouldn't happen, but test graceful handling)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 304,
        headers: new Map([['ETag', 'etag123']]),
      } as any);

      // Retry without If-None-Match should return 200
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag123'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData,
      } as any);

      const result = await client.get<Product>('rest/connections/Northwinds/tables/Products');
      
      expect(result.data).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Management Methods', () => {
    beforeEach(async () => {
      // Setup: Add some cache entries
      const mockData = [{ id: 1, name: 'Product 1', categoryId: 1 }];
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag123'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData,
      } as any);

      await client.get<Product>('rest/connections/Northwinds/tables/Products', {
        filters: { categoryId: { eq: 1 } },
      });
      await client.get<Product>('rest/connections/Northwinds/tables/Products', {
        filters: { categoryId: { eq: 2 } },
      });
      await client.get<Product>('rest/connections/Northwinds/tables/Customers');

      mockFetch.mockClear();
    });

    it('should clear all caches', async () => {
      await client.clearCache();

      const stats = client.getETagCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear cache for specific endpoint', async () => {
      await client.clearCache('Northwinds', 'tables/Products');

      const stats = client.getETagCacheStats();
      expect(stats.size).toBe(1); // Only Customers entry remains
    });

    it('should clear cache for specific query', async () => {
      await client.clearCache('Northwinds', 'tables/Products', {
        filters: { categoryId: { eq: 1 } },
      });

      const stats = client.getETagCacheStats();
      expect(stats.size).toBe(2); // categoryId:2 and Customers remain
    });

    it('should get cache statistics', () => {
      const stats = client.getETagCacheStats();
      
      expect(stats.size).toBe(3);
      expect(stats.hits).toBeGreaterThanOrEqual(0);
      expect(stats.misses).toBeGreaterThanOrEqual(0);
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('Disabled ETag Cache', () => {
    beforeEach(() => {
      client = new VystaClient({
        baseUrl: 'https://api.example.com',
        etag: { enabled: false },
      });

      // Mock auth for disabled cache test too
      const mockAuth: any = {
        getAuthHeaders: (jest.fn() as any).mockResolvedValue({
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
        }),
        login: jest.fn(),
        logout: jest.fn(),
        getSignInMethods: jest.fn(),
        getAuthorizeUrl: jest.fn(),
        handleAuthenticationRedirect: jest.fn(),
        exchangeToken: jest.fn(),
        getUserProfile: jest.fn(),
        forgotPassword: jest.fn(),
        validateCode: jest.fn(),
        changePassword: jest.fn(),
        acceptInvitation: jest.fn(),
        validateInvitation: jest.fn(),
        setHost: jest.fn(),
        getAvailableEnvironments: jest.fn(),
        switchEnvironment: jest.fn(),
        constructAuthenticationRedirectUrl: jest.fn(),
        getCurrentEnvironmentInfo: jest.fn(),
      };
      (client as any).auth = mockAuth;
    });

    it('should not use ETag when disabled', async () => {
      const mockData = [{ id: 1, name: 'Product 1', categoryId: 1 }];
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([
          ['ETag', 'etag123'],
          ['Content-Type', 'application/json'],
        ]),
        json: async () => mockData,
      } as any);

      await client.get<Product>('rest/connections/Northwinds/tables/Products');
      await client.get<Product>('rest/connections/Northwinds/tables/Products');

      // Both requests should be full requests (no If-None-Match header)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      const firstCallHeaders = (mockFetch.mock.calls[0] as any)[1].headers;
      const secondCallHeaders = (mockFetch.mock.calls[1] as any)[1].headers;
      
      expect(firstCallHeaders['If-None-Match']).toBeUndefined();
      expect(secondCallHeaders['If-None-Match']).toBeUndefined();

      const stats = client.getETagCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});

