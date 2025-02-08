import {VystaClient} from '../VystaClient.js';
import {DataResult, FileType, QueryParams} from '../types.js';
import {IReadonlyDataService} from '../IDataService.js';

export abstract class VystaReadonlyService<T, U = T> implements IReadonlyDataService<T, U> {
  constructor(
    protected client: VystaClient,
    protected connection: string,
    protected entity: string
  ) {}

  /**
   * Override this method to hydrate each row with additional computed properties
   * @param row - The original row from the database
   * @returns A hydrated row with additional properties
   */
  protected hydrate(row: T): U {
    return row as unknown as U;
  }

  /**
   * Retrieves all records matching the optional query parameters
   * @param params - Optional query parameters for filtering, sorting, and pagination
   * @returns A promise that resolves to a DataResult containing the records and total count
   */
  async getAll(params: QueryParams<T> = {}): Promise<DataResult<U>> {
    const response = await this.client.get<T>(`${this.connection}/${this.entity}`, params);
    return {
      data: response.data ? response.data.map(row => this.hydrate(row)) : [],
      count: response.recordCount ?? -1,
      error: null
    };
  }

  /**
   * Queries records using complex conditions in the request body
   * @param params - Query parameters including conditions to be sent in the request body
   * @returns A promise that resolves to a DataResult containing the records and total count
   */
  async query(params: QueryParams<T> = {}): Promise<DataResult<U>> {
    const response = await this.client.query<T>(`${this.connection}/${this.entity}`, params);
    return {
      data: response.data ? response.data.map(row => this.hydrate(row)) : [],
      count: response.recordCount ?? -1,
      error: null
    };
  }

  async download(params: QueryParams<T> = {}, fileType: FileType = FileType.CSV): Promise<Blob> {
    const response = await this.client.download(`${this.connection}/${this.entity}`, params, fileType);

    return response;
  }

}