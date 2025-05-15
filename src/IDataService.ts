import { DataResult, FileType, QueryParams } from './types.js';

export type PrimaryKeyType<T = any> =
  | string
  | number
  | {
      [K in keyof T]?: string | number;
    };

export interface IReadonlyDataService<T, U = T> {
  getAll(params?: QueryParams<T>): Promise<DataResult<U>>;
  query(params?: QueryParams<T>): Promise<DataResult<U>>;
  download(params?: QueryParams<T>, fileType?: FileType): Promise<Blob>;
}

export interface IDataService<T, U = T> extends IReadonlyDataService<T, U> {
  getById(id: PrimaryKeyType<T>): Promise<U>;
  create(data: T): Promise<U>;
  update(id: PrimaryKeyType<T>, data: Partial<T>): Promise<number>;
  updateWhere(params: QueryParams<T>, data: Partial<T>): Promise<number>;
  delete(id: PrimaryKeyType<T>): Promise<number>;
  deleteWhere(params: QueryParams<T>): Promise<number>;
}
