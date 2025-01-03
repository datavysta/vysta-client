export interface VystaConfig {
  baseUrl: string;
  debug?: boolean;
}

export interface Principal {
  userId: string;
  identityId: string;
  tenantId: string;
  envId: string;
  roleId: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  host: string;
  expiration: number;
  principal: Principal;
}

export interface DataResult<T> {
  data: T[];
  error: Error | null;
  count: number;
}

export type FilterOperator = 
  | 'eq' 
  | 'neq' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'like' 
  | 'nlike' 
  | 'in' 
  | 'nin' 
  | 'isnull' 
  | 'isnotnull';

export type SortDirection = 'asc' | 'desc';

export type FilterValue = string | number | boolean | Array<string | number>;

export type FilterCondition = {
  [K in FilterOperator]?: FilterValue;
};

export type OrderBy<T> = {
  [K in keyof T]?: SortDirection;
};

export type QueryParams<T> = {
  select?: Array<keyof T>;
  filters?: {
    [K in keyof T]?: FilterCondition;
  };
  order?: OrderBy<T>;
  limit?: number;
  offset?: number;
  recordCount?: boolean;
};

export interface VystaResponse<T> {
  data: T;
  status: number;
  message?: string;
}