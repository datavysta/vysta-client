import { QueryParams, DataResult } from './types.js';

export interface IReadonlyDataService<T, U = T> {
    getAll(params?: QueryParams<T>): Promise<DataResult<U>>;
    query(params?: QueryParams<T>): Promise<DataResult<U>>;
}

export interface IDataService<T, U = T> extends IReadonlyDataService<T, U> {
    getById(id: number | string): Promise<U>;
    create(data: T): Promise<U>;
    update(id: number | string, data: Partial<T>): Promise<number>;
    updateWhere(params: QueryParams<T>, data: Partial<T>): Promise<number>;
    delete(id: number | string): Promise<number>;
    deleteWhere(params: QueryParams<T>): Promise<number>;
} 