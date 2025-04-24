import { VystaClient } from '../VystaClient.js';
import { VystaService } from './VystaService.js';
import { PrimaryKeyType } from '../IDataService.js';

export abstract class VystaAdminService<T, U = T> extends VystaService<T, U> {
  constructor(client: VystaClient, connection: string, entity: string, config: { primaryKey: keyof T | Array<keyof T> }) {
    super(client, connection, entity, config);
    this.basePath = 'api';
  }

  async getById(id: PrimaryKeyType<T>): Promise<U> {
    const response = await this.client.get<T>(this.buildPath(`id/${id}`));
    const row = Array.isArray(response.data) ? response.data[0] : response.data;
    return this.hydrate(row);
  }

  async update(id: PrimaryKeyType<T>, data: Partial<T>): Promise<number> {
    return this.client.put(this.buildPath(`id/${id}`), data);
  }

  async delete(id: PrimaryKeyType<T>): Promise<number> {
    return this.client.delete(this.buildPath(`id/${id}`));
  }
} 