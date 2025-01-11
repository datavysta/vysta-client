import { QueryParams, DataResult } from './types';

export interface IReadonlyDataService<T, U = T> {
    getAll(params?: QueryParams<T>): Promise<DataResult<U>>;
}

export interface IDataService<T, U = T> extends IReadonlyDataService<T, U> {
    getById(id: string | number): Promise<U>;
    create(data: Partial<T>): Promise<U>;
    update(id: string | number, data: Partial<T>): Promise<number>;
    updateWhere(params: QueryParams<T>, data: Partial<T>): Promise<number>;
    delete(id: string | number): Promise<number>;
    deleteWhere(params: QueryParams<T>): Promise<number>;
} 