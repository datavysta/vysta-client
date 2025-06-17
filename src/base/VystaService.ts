import { VystaClient } from '../VystaClient.js';
import { QueryParams, FilterCondition } from '../types.js';
import { VystaReadonlyService } from './VystaReadonlyService.js';
import { IDataService, PrimaryKeyType } from '../IDataService.js';
import { generateCacheKey, generateInvalidationPattern } from '../cache/CacheUtils.js';

export interface ServiceConfig<T> {
  primaryKey: keyof T | Array<keyof T>;
  basePath?: string;
}

export class VystaService<T, U = T>
  extends VystaReadonlyService<T, U>
  implements IDataService<T, U>
{
  protected primaryKey: keyof T | Array<keyof T>;
  protected basePath: string;

  constructor(client: VystaClient, connection: string, entity: string, config: ServiceConfig<T>) {
    super(client, connection, entity);
    this.primaryKey = config.primaryKey;
    this.basePath = config.basePath ?? 'rest/connections';
  }

  protected createPkFilter(id: PrimaryKeyType<T>): QueryParams<T> {
    if (Array.isArray(this.primaryKey)) {
      if (typeof id !== 'object') {
        throw new Error('Multi-part primary key requires an object with key-value pairs');
      }
      const filters = {} as { [K in keyof T]?: FilterCondition };
      for (const key of this.primaryKey) {
        if (!(key in id)) {
          throw new Error(`Missing primary key part: ${String(key)}`);
        }
        filters[key] = { eq: id[key as keyof typeof id] };
      }
      return { filters };
    }

    return {
      filters: {
        [this.primaryKey]: { eq: id },
      } as { [K in keyof T]?: FilterCondition },
    };
  }

  /**
   * Invalidates all cache entries for this service
   */
  protected async invalidateCache(): Promise<void> {
    const cache = this.client.getCache();
    if (cache) {
      const pattern = generateInvalidationPattern(this.connection, this.entity);
      await cache.deleteByPattern(pattern);
    }
  }

  /**
   * Retrieves a single record by its primary key
   * @param id - The primary key value. For multi-part keys, pass an object with key-value pairs
   * @returns A promise that resolves to a single record
   */
  async getById(id: PrimaryKeyType<T>): Promise<U> {
    const cache = this.client.getCache();

    if (cache) {
      const cacheKey = generateCacheKey(this.connection, this.entity, 'getById', { id });

      // Try to get from cache
      const cachedEntry = await cache.get<T>(cacheKey);
      if (cachedEntry && cachedEntry.records.length > 0) {
        return this.hydrate(cachedEntry.records[0]);
      }

      // Cache miss - fetch from API
      const response = await this.client.get<T>(this.buildPath(''), this.createPkFilter(id));
      const row = Array.isArray(response.data) ? response.data[0] : response.data;

      // Cache the result
      if (row) {
        const cacheEntryValue = {
          records: [row],
          loadedRanges: [{ start: 0, end: 0 }],
          totalCount: 1,
          timestamp: Date.now(),
        };
        await cache.set(cacheKey, cacheEntryValue);
      }

      return this.hydrate(row);
    }

    // No caching - direct API call
    const response = await this.client.get<T>(this.buildPath(''), this.createPkFilter(id));
    const row = Array.isArray(response.data) ? response.data[0] : response.data;
    return this.hydrate(row);
  }

  /**
   * Creates a new record
   * @param data - The data to create
   * @returns A promise that resolves to the created record
   */
  async create(data: T): Promise<U> {
    const response = await this.client.post<T>(this.buildPath(''), data);

    // Invalidate cache after write operation
    await this.invalidateCache();

    // Cast the response as T since we know in create context it should always return data
    return this.hydrate(response as T);
  }

  /**
   * Updates a single record by its primary key
   * @param id - The primary key value. For multi-part keys, pass an object with key-value pairs
   * @param data - The data to update
   * @returns A promise that resolves to the number of affected rows
   */
  async update(id: PrimaryKeyType<T>, data: Partial<T>): Promise<number> {
    const result = await this.client.patch(this.buildPath(''), data, this.createPkFilter(id));

    // Invalidate cache after write operation
    await this.invalidateCache();

    return result;
  }

  /**
   * Updates multiple records matching the query parameters
   * @param params - Query parameters to filter which records to update
   * @param data - The data to update
   * @returns A promise that resolves to the number of affected rows
   */
  async updateWhere(params: QueryParams<T>, data: Partial<T>): Promise<number> {
    const result = await this.client.patch(this.buildPath(''), data, params);

    // Invalidate cache after write operation
    await this.invalidateCache();

    return result;
  }

  /**
   * Deletes a single record by its primary key
   * @param id - The primary key value. For multi-part keys, pass an object with key-value pairs
   * @returns A promise that resolves to the number of affected rows
   */
  async delete(id: PrimaryKeyType<T>): Promise<number> {
    const result = await this.client.delete(this.buildPath(''), this.createPkFilter(id));

    // Invalidate cache after write operation
    await this.invalidateCache();

    return result;
  }

  /**
   * Deletes multiple records matching the query parameters
   * @param params - Query parameters to filter which records to delete
   * @returns A promise that resolves to the number of affected rows
   */
  async deleteWhere(params: QueryParams<T>): Promise<number> {
    const result = await this.client.delete(this.buildPath(''), params);

    // Invalidate cache after write operation
    await this.invalidateCache();

    return result;
  }
}
