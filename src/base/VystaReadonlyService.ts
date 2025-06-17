import { VystaClient } from '../VystaClient.js';
import { DataResult, FileType, QueryParams } from '../types.js';
import { IReadonlyDataService } from '../IDataService.js';
import { CacheStorage, CacheEntry } from '../cache/CacheStorage.js';
import {
  generateCacheKey,
  extractRangeFromCache,
  mergeRangeIntoCache,
  generateInvalidationPattern,
} from '../cache/CacheUtils.js';

export abstract class VystaReadonlyService<T, U = T> implements IReadonlyDataService<T, U> {
  protected basePath: string;

  constructor(
    protected client: VystaClient,
    protected connection: string,
    protected entity: string,
    basePath: string = 'rest/connections',
  ) {
    this.basePath = basePath;
  }

  protected buildPath(path: string = ''): string {
    const base = this.basePath ? `${this.basePath}/` : '';
    const fullPath = `${base}${this.connection}/${this.entity}${path ? '/' + path : ''}`;
    return fullPath;
  }

  /**
   * Override this method to hydrate each row with additional computed properties
   * @param row - The original row from the database
   * @returns A hydrated row with additional properties
   */
  protected hydrate(row: T): U {
    return row as unknown as U;
  }

  /**
   * Updates cache with new data, merging with existing cache if present
   */
  protected async updateCache(
    cache: CacheStorage,
    cacheKey: string,
    newData: T[],
    offset: number,
    totalCount?: number,
    existingEntry?: CacheEntry<T> | null,
  ): Promise<void> {
    try {
      if (existingEntry) {
        // Merge with existing cache
        const { records, ranges } = mergeRangeIntoCache(
          existingEntry.records,
          existingEntry.loadedRanges,
          newData,
          offset,
        );

        const updatedEntry: CacheEntry<T> = {
          ...existingEntry,
          records,
          loadedRanges: ranges,
          totalCount: totalCount ?? existingEntry.totalCount,
          timestamp: Date.now(),
        };

        await cache.set(cacheKey, updatedEntry);
      } else {
        // Create new cache entry
        const newEntry: CacheEntry<T> = {
          records: [...newData],
          loadedRanges: [{ start: offset, end: offset + newData.length - 1 }],
          totalCount: totalCount,
          timestamp: Date.now(),
        };

        await cache.set(cacheKey, newEntry);
      }
    } catch (error) {
      console.warn('[VystaCache] Failed to update cache:', error);
    }
  }

  /**
   * Helper that computes inferred totalCount (when API doesn't return it) and writes range to cache.
   */
  private async storeRange(
    cache: CacheStorage,
    cacheKey: string,
    data: T[],
    offset: number,
    limit: number,
    recordCount: number | undefined,
    existingEntry: CacheEntry<T> | null,
  ): Promise<void> {
    const inferredCount =
      recordCount ?? (data.length < limit ? offset + data.length : undefined);

    await this.updateCache(cache, cacheKey, data, offset, inferredCount, existingEntry);
  }

  /**
   * Retrieves all records matching the optional query parameters
   * @param params - Optional query parameters for filtering, sorting, and pagination
   * @returns A promise that resolves to a DataResult containing the records and total count
   */
  async getAll(params: QueryParams<T> = {}): Promise<DataResult<U>> {
    const cache = this.client.getCache();

    if (cache) {
      const cacheKey = generateCacheKey(this.connection, this.entity, 'getAll', params);
      const offset = params.offset || 0;
      const limit = params.limit || 50;

      // Try to get from cache
      const cachedEntry = await cache.get<T>(cacheKey);
      if (cachedEntry) {
        const cachedData = extractRangeFromCache(
          cachedEntry.records,
          offset,
          limit,
          cachedEntry.loadedRanges,
          cachedEntry.totalCount,
        );

        if (cachedData !== null) {
          return {
            data: cachedData.map(row => this.hydrate(row)),
            count: cachedEntry.totalCount ?? -1,
            error: null,
          };
        }
      }

      // Cache miss or partial data - fetch from API
      const response = await this.client.get<T>(this.buildPath(), params);
      const hydratedData = response.data ? response.data.map(row => this.hydrate(row)) : [];

      // Update cache
      if (response.data) {
        await this.storeRange(
          cache,
          cacheKey,
          response.data,
          offset,
          limit,
          response.recordCount,
          cachedEntry,
        );
      }

      return {
        data: hydratedData,
        count: response.recordCount ?? -1,
        error: null,
      };
    }

    // No caching - direct API call
    const response = await this.client.get<T>(this.buildPath(), params);
    return {
      data: response.data ? response.data.map(row => this.hydrate(row)) : [],
      count: response.recordCount ?? -1,
      error: null,
    };
  }

  /**
   * Queries records using complex conditions in the request body
   * @param params - Query parameters including conditions to be sent in the request body
   * @returns A promise that resolves to a DataResult containing the records and total count
   */
  async query(params: QueryParams<T> = {}): Promise<DataResult<U>> {
    const cache = this.client.getCache();

    if (cache) {
      const cacheKey = generateCacheKey(this.connection, this.entity, 'query', params);
      const offset = params.offset || 0;
      const limit = params.limit || 50;

      // Try to get from cache
      const cachedEntry = await cache.get<T>(cacheKey);
      if (cachedEntry) {
        const cachedData = extractRangeFromCache(
          cachedEntry.records,
          offset,
          limit,
          cachedEntry.loadedRanges,
          cachedEntry.totalCount,
        );

        if (cachedData !== null) {
          return {
            data: cachedData.map(row => this.hydrate(row)),
            count: cachedEntry.totalCount ?? -1,
            error: null,
          };
        }
      }

      // Cache miss or partial data - fetch from API
      const response = await this.client.query<T>(this.buildPath(), params);
      const hydratedData = response.data ? response.data.map(row => this.hydrate(row)) : [];

      // Update cache
      if (response.data) {
        await this.storeRange(
          cache,
          cacheKey,
          response.data,
          offset,
          limit,
          response.recordCount,
          cachedEntry,
        );
      }

      return {
        data: hydratedData,
        count: response.recordCount ?? -1,
        error: null,
      };
    }

    // No caching - direct API call
    const response = await this.client.query<T>(this.buildPath(), params);
    return {
      data: response.data ? response.data.map(row => this.hydrate(row)) : [],
      count: response.recordCount ?? -1,
      error: null,
    };
  }

  async download(params: QueryParams<T> = {}, fileType: FileType = FileType.CSV): Promise<Blob> {
    const response = await this.client.download(this.buildPath(), params, fileType);
    return response;
  }

  /**
   * Refreshes cache for this service by clearing all cached entries
   */
  async refreshCache(): Promise<void> {
    const cache = this.client.getCache();
    if (cache) {
      const pattern = generateInvalidationPattern(this.connection, this.entity);
      await cache.deleteByPattern(pattern);
    }
  }
}
