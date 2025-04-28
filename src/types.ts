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

export enum FileType {
  CSV = "text/csv",
  EXCEL = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

export type FilterValue = string | number | boolean | Array<string | number>;

export type FilterCondition = {
  [K in FilterOperator]?: FilterValue;
};

export type OrderBy<T> = {
  [K in keyof T]?: SortDirection;
};

export type QueryParams<T> = {
  select?: { [K in keyof T]?: string; } | Array<keyof T>;
  filters?: {
    [K in keyof T]?: FilterCondition;
  };
  order?: OrderBy<T>;
  limit?: number;
  offset?: number;
  recordCount?: boolean;
  inputProperties?: {
    [key: string]: string;
  };
  conditions?: any;
  q?: string;
};

export interface VystaResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  emailVerifiedOn: string | null;
  phoneNumber: string | null;
  phoneNumberVerifiedOn: string | null;
  apiKeyCreatedOn: string | null;
  forceChange: boolean;
  disabled: boolean;
  properties: any | null;
  roleId: string;
}

// Canonical object-level permission model for use across the codebase
export interface ObjectPermission {
  id: string;
  children: ObjectPermission[];
  where: any;
  grants: string[];
}