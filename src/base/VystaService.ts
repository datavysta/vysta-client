import { VystaClient } from '../VystaClient';
import { QueryParams, FilterCondition } from '../types';

export interface ServiceConfig<T> {
  primaryKey: keyof T;
}

export class VystaService<T> {
  protected primaryKey: keyof T;

  constructor(
    protected client: VystaClient,
    protected connection: string,
    protected entity: string,
    config: ServiceConfig<T>
  ) {
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
   * Retrieves all records matching the optional query parameters
   * @param params - Optional query parameters for filtering, sorting, and pagination
   * @returns A promise that resolves to an array of records
   */
  async getAll(params?: QueryParams<T>): Promise<T[]> {
    const response = await this.client.get<T>(`${this.connection}/${this.entity}`, params);
    return Array.isArray(response) ? response : [response];
  }

  /**
   * Retrieves a single record by its primary key
   * @param id - The primary key value
   * @returns A promise that resolves to a single record
   */
  async getById(id: string | number): Promise<T> {
    const response = await this.client.get<T>(
      `${this.connection}/${this.entity}`, 
      this.createPkFilter(id)
    );
    return Array.isArray(response) ? response[0] : response;
  }

  /**
   * Creates a new record
   * @param data - The data to create
   * @returns A promise that resolves to the created record
   */
  async create(data: T): Promise<T> {
    return this.client.post<T>(
      `${this.connection}/${this.entity}`, 
      data
    );
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