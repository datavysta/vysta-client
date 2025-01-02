import { QueryParams, DataResult } from './types';

export interface IDataService<T> {
    getAll(params?: QueryParams<T>): Promise<DataResult<T>>;
    getById(id: string | number): Promise<T>;
    create(data: Partial<T>): Promise<T>;
    update(id: string | number, data: Partial<T>): Promise<number>;
    updateWhere(params: QueryParams<T>, data: Partial<T>): Promise<number>;
    delete(id: string | number): Promise<number>;
    deleteWhere(params: QueryParams<T>): Promise<number>;
} 