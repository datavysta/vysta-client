import { VystaClient } from '../VystaClient.js';
import { QueryParams, DataResult } from '../types.js';

export class VystaReadonlyService<T> {
  constructor(
    protected client: VystaClient,
    protected connection: string,
    protected entity: string
  ) {}

  /**
   * Retrieves all records matching the optional query parameters
   * @param params - Optional query parameters for filtering, sorting, and pagination
   * @returns A promise that resolves to a DataResult containing the records and total count
   */
  async getAll(params: QueryParams<T> = {}): Promise<DataResult<T>> {
    const response = await this.client.get<T>(`${this.connection}/${this.entity}`, params);
    return {
      data: response.data as T[],
      count: response.recordCount ?? -1,
      error: null
    };
  }
} 