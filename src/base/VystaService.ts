import { VystaClient } from '../VystaClient.js';
import { QueryParams, FilterCondition, DataResult, FileType } from '../types.js';
import { VystaReadonlyService } from './VystaReadonlyService.js';
import { IDataService, PrimaryKeyType } from '../IDataService.js';

export interface ServiceConfig<T> {
  primaryKey: keyof T | Array<keyof T>;
  basePath?: string;
}

export class VystaService<T, U = T> extends VystaReadonlyService<T, U> implements IDataService<T, U> {
  protected primaryKey: keyof T | Array<keyof T>;
  protected basePath: string;

  constructor(
    client: VystaClient,
    connection: string,
    entity: string,
    config: ServiceConfig<T>
  ) {
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
        [this.primaryKey]: { eq: id }
      } as { [K in keyof T]?: FilterCondition }
    };
  }

  /**
   * Retrieves a single record by its primary key
   * @param id - The primary key value. For multi-part keys, pass an object with key-value pairs
   * @returns A promise that resolves to a single record
   */
  async getById(id: PrimaryKeyType<T>): Promise<U> {
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
    return this.client.patch(this.buildPath(''), data, this.createPkFilter(id));
  }

  /**
   * Updates multiple records matching the query parameters
   * @param params - Query parameters to filter which records to update
   * @param data - The data to update
   * @returns A promise that resolves to the number of affected rows
   */
  async updateWhere(params: QueryParams<T>, data: Partial<T>): Promise<number> {
    return this.client.patch(this.buildPath(''), data, params);
  }

  /**
   * Deletes a single record by its primary key
   * @param id - The primary key value. For multi-part keys, pass an object with key-value pairs
   * @returns A promise that resolves to the number of affected rows
   */
  async delete(id: PrimaryKeyType<T>): Promise<number> {
    return this.client.delete(this.buildPath(''), this.createPkFilter(id));
  }

  /**
   * Deletes multiple records matching the query parameters
   * @param params - Query parameters to filter which records to delete
   * @returns A promise that resolves to the number of affected rows
   */
  async deleteWhere(params: QueryParams<T>): Promise<number> {
    return this.client.delete(this.buildPath(''), params);
  }
} 