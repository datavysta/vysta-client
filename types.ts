export interface VystaConfig {
  baseUrl?: string;
  fallbackUrls?: string[];
}

export interface ConnectionConfig {
  name: string;
  entities: string[];
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiration: number;
  principal?: {
    tenantId: string;
    envId: string;
    userId: string;
    identityId: string;
    role: string;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  emailVerifiedOn: string | null;
  phoneNumber: string | null;
  phoneNumberVerifiedOn: string | null;
  apiKeyCreatedOn: string;
  forceChange: boolean;
  roleId: string;
}

export type ComparisonOperator = 
  | 'gt' 
  | 'gte' 
  | 'eq' 
  | 'neq' 
  | 'lt' 
  | 'lte' 
  | 'like' 
  | 'nlike' 
  | 'in' 
  | 'nin' 
  | 'isnull' 
  | 'isnotnull';

export type FieldFilter = {
  [key: string]: {
    [K in ComparisonOperator]?: string | number | boolean | Array<any>;
  };
};

export interface QueryParams {
  select?: string[];  // Columns to return
  offset?: number;    // Pagination offset
  limit?: number;     // Pagination limit
  filters?: FieldFilter;  // Field filters with operators
}

export interface VystaResponse<T> {
  data: T;
  status: number;
  message?: string;
} 