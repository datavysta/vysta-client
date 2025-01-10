import { VystaClient } from '../VystaClient.js';
import { QueryParams, FilterCondition } from '../types.js';
import { VystaReadonlyService } from './VystaReadonlyService.js';

export interface ServiceConfig<T> {
  primaryKey: keyof T;
}

export class VystaService<T, U = T> extends VystaReadonlyService<T, U> {
  protected primaryKey: keyof T;

  constructor(
    client: VystaClient,
    connection: string,
    entity: string,
    config: ServiceConfig<T>
  ) {
    super(client, connection, entity);
    this.primaryKey = config.primaryKey;
  }

  protected createPkFilter(id: string | number): QueryParams<T> {
    return {
      filters: {
        [this.primaryKey]: { eq: id }
      } as { [K in keyof T]?: FilterCondition }
    };
  }

  /**
   * Retrieves a single record by its primary key
   * @param id - The primary key value
   * @returns A promise that resolves to a single record
   */
  async getById(id: string | number): Promise<U> {
    const response = await this.client.get<T>(
      `${this.connection}/${this.entity}`, 
      this.createPkFilter(id)
    );
    const row = Array.isArray(response.data) ? response.data[0] : response.data;
    return this.hydrate(row);
  }

  /**
   * Creates a new record
   * @param data - The data to create
   * @returns A promise that resolves to the created record
   */
  async create(data: Partial<T>): Promise<U> {
    const response = await this.client.post<T>(
      `${this.connection}/${this.entity}`, 
      data as T
    );
    return this.hydrate(response);
  }

  /**
   * Updates a single record by its primary key
   * @param id - The primary key value
   * @param data - The data to update
   * @returns A promise that resolves to the number of affected rows
   */
  async update(id: string | number, data: Partial<T>): Promise<number> {
    return this.client.patch(
      `${this.connection}/${this.entity}`, 
      data,
      this.createPkFilter(id)
    );
  }

  /**
   * Updates multiple records matching the query parameters
   * @param params - Query parameters to filter which records to update
   * @param data - The data to update
   * @returns A promise that resolves to the number of affected rows
   */
  async updateWhere(params: QueryParams<T>, data: Partial<T>): Promise<number> {
    return this.client.patch(
      `${this.connection}/${this.entity}`, 
      data,
      params
    );
  }

  /**
   * Deletes a single record by its primary key
   * @param id - The primary key value
   * @returns A promise that resolves to the number of affected rows
   */
  async delete(id: string | number): Promise<number> {
    return this.client.delete(
      `${this.connection}/${this.entity}`,
      this.createPkFilter(id)
    );
  }

  /**
   * Deletes multiple records matching the query parameters
   * @param params - Query parameters to filter which records to delete
   * @returns A promise that resolves to the number of affected rows
   */
  async deleteWhere(params: QueryParams<T>): Promise<number> {
    return this.client.delete(
      `${this.connection}/${this.entity}`,
      params
    );
  }
} 