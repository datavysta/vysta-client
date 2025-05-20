import { AuthErrorHandler, SignInInfo, TokenStorage, VystaAuth } from './VystaAuth.js';
import type { FilterCondition, QueryParams, UserProfile } from './types.js';
import { AuthResult, FileType } from './types.js';

export interface GetResponse<T> {
  data: T[];
  recordCount?: number;
}

export interface VystaConfig {
  baseUrl: string;
  storage?: TokenStorage;
  errorHandler?: AuthErrorHandler;
  debug?: boolean;
}

export class VystaClient {
  private auth: VystaAuth;
  private debug: boolean;

  constructor(private config: VystaConfig) {
    this.debug = config.debug || false;
    this.auth = new VystaAuth(this.config.baseUrl, config.storage, config.errorHandler);
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log('[VystaClient]', ...args);
    }
  }

  private logRequest(method: string, url: string, body?: any) {
    if (this.debug) {
      console.log(`[VystaClient] ${method} ${url}`);
      if (body) {
        console.log('[VystaClient] Request Body:', body);
      }
    }
  }

  /**
   * Gets the full URL for a backend path
   * @param path - The path to append to the base URL
   * @returns The full URL
   */
  getBackendUrl(path: string): string {
    if (path.startsWith('api/')) {
      return `${this.config.baseUrl}/${path}`;
    }
    return `${this.config.baseUrl}/api/${path}`;
  }

  private buildQueryString(params?: QueryParams<any>): string {
    if (!params) return '';

    const queryParts: string[] = [];

    // Support string[], object mapping, or SelectColumn[] for select in query string (now with aggregate support in key)
    if (params.select) {
      if (Array.isArray(params.select) && params.select.length) {
        if (typeof params.select[0] === 'string') {
          queryParts.push(`select=${(params.select as string[]).join(',')}`);
        } else if (typeof params.select[0] === 'object' && 'name' in params.select[0]) {
          // SelectColumn[]: serialize to string[]
          const selectStrings = this.serializeSelect(params.select) || [];
          queryParts.push(`select=${selectStrings.join(',')}`);
        } else {
          throw new Error('Invalid select array format for query string endpoints');
        }
      } else if (typeof params.select === 'object' && !Array.isArray(params.select)) {
        // Object mapping: { column or AGG(column): alias }
        const mappedSelect = Object.entries(params.select)
          .map(([key, value]) => {
            if (typeof value !== 'string') {
              throw new Error('Alias must be a string in select object mapping');
            }
            // Allow aggregate functions in key, e.g., SUM(amount)
            return `${key}=${value}`;
          })
          .join(',');
        queryParts.push(`select=${mappedSelect}`);
      } else {
        throw new Error('Only string[], SelectColumn[], or object mapping is supported for select in query string endpoints');
      }
    }

    if (params.filters) {
      Object.entries(params.filters).forEach(([field, conditions]) => {
        if (conditions) {
          Object.entries(conditions as FilterCondition).forEach(([operator, value]) => {
            const encodedValue =
              operator === 'like' || operator === 'nlike'
                ? encodeURIComponent(value as string)
                : value;
            queryParts.push(`${field}=${operator}.${encodedValue}`);
          });
        }
      });
    }

    if (params.order) {
      Object.entries(params.order).forEach(([field, direction]) => {
        queryParts.push(`order=${field}.${direction}`);
      });
    }

    if (params.limit !== undefined) {
      queryParts.push(`limit=${params.limit}`);
    }

    if (params.recordCount) {
      queryParts.push('recordCount=true');
    }

    if (params.q) {
      queryParts.push(`q=${encodeURIComponent(params.q)}`);
    }

    if (params.offset !== undefined) {
      queryParts.push(`offset=${params.offset}`);
    }

    if (params.inputProperties) {
      Object.entries(params.inputProperties).forEach(([key, value]) => {
        queryParts.push(`${key}=${encodeURIComponent(value)}`);
      });
    }

    return queryParts.length ? `?${queryParts.join('&')}` : '';
  }

  /**
   * Authenticates a user with the Vysta API
   * @param username - The user's email address
   * @param password - The user's password
   * @returns A promise that resolves to an AuthResult containing tokens and user info
   */
  async login(username: string, password: string): Promise<AuthResult> {
    const result = await this.auth.login(username, password);
    return result;
  }

  /**
   * Logs out the current user and clears all authentication data
   */
  async logout(): Promise<void> {
    await this.auth.logout();
  }

  /**
   * Performs a GET request to retrieve data
   * @param path - The path to the resource
   * @param params - Optional query parameters
   * @returns A promise that resolves to a GetResponse containing data and optional record count
   * @throws Error if conditions are used (use query() method instead)
   */
  async get<T>(path: string, params?: QueryParams<T>): Promise<GetResponse<T>> {
    try {
      if (params?.conditions) {
        throw new Error('Use query() method for queries with conditions');
      }

      const headers = await this.auth.getAuthHeaders();
      const url = this.getBackendUrl(`${path}${this.buildQueryString(params)}`);

      this.logRequest('GET', url);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, url);
      }

      const data = await response.json();
      const recordCount = params?.recordCount
        ? Number(response.headers.get('Recordcount') ?? -1)
        : undefined;

      return { data, recordCount };
    } catch (error) {
      this.log('Request failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Performs a POST request to create new data
   * @param path - The path to the resource
   * @param data - The data to create
   * @returns A promise that resolves to the created item, parsed based on Content-Type
   */
  async post<T>(path: string, data: T): Promise<T> {
    const headers = await this.auth.getAuthHeaders();
    const url = this.getBackendUrl(`${path}`);

    this.logRequest('POST', url, data);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, url);
    }

    // Handle different response types based on Content-Type header
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType && contentType.includes('text')) {
      return (await response.text()) as unknown as T;
    } else {
      // Default to blob for other content types
      return (await response.blob()) as unknown as T;
    }
  }

  /**
   * Performs a PATCH request to update existing data
   * @param path - The path to the resource
   * @param data - The data to update
   * @param params - Optional query parameters to filter what gets updated
   * @returns A promise that resolves to the number of affected rows
   */
  async patch<T>(path: string, data: Partial<T>, params?: QueryParams<T>): Promise<number> {
    const headers = await this.auth.getAuthHeaders();
    const url = this.getBackendUrl(`${path}${this.buildQueryString(params)}`);

    this.logRequest('PATCH', url, data);

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, url);
    }

    return Number(response.headers.get('AffectedRows') || '0');
  }

  async put<T>(path: string, data: T): Promise<number> {
    const headers = await this.auth.getAuthHeaders();
    const url = this.getBackendUrl(`${path}`);

    this.logRequest('PUT', url, data);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, url);
    }

    // Return affected rows if available, otherwise 1 (for single update)
    return Number(response.headers.get('AffectedRows') || '1');
  }

  /**
   * Performs a DELETE request to remove data
   * @param path - The path to the resource
   * @param params - Optional query parameters to filter what gets deleted
   * @returns A promise that resolves to the number of affected rows
   */
  async delete(path: string, params?: QueryParams<any>): Promise<number> {
    const headers = await this.auth.getAuthHeaders();
    const url = this.getBackendUrl(`${path}${this.buildQueryString(params)}`);

    this.logRequest('DELETE', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, url);
    }

    return Number(response.headers.get('AffectedRows') || '0');
  }

  async getSignInMethods(): Promise<SignInInfo[]> {
    return this.auth.getSignInMethods();
  }

  async getAuthorizeUrl(signInId: string): Promise<string> {
    return this.auth.getAuthorizeUrl(signInId);
  }

  async handleAuthenticationRedirect(token: string): Promise<AuthResult> {
    return this.auth.handleAuthenticationRedirect(token);
  }

  async exchangeToken(token: string): Promise<AuthResult> {
    return this.auth.exchangeToken(token);
  }

  async getUserProfile(): Promise<UserProfile> {
    return this.auth.getUserProfile();
  }

  private serializeSelect<T>(select: QueryParams<T>['select']): string[] | undefined {
    if (!select) return undefined;
    if (Array.isArray(select) && select.length && typeof select[0] === 'object' && 'name' in select[0]) {
      // SelectColumn<T>[]
      return (select as any[]).map((col: any) => {
        let part = col.name;
        if (col.aggregate) {
          part = `${col.aggregate}(${part})`;
        }
        if (col.alias) {
          part += `=${col.alias}`;
        }
        return part;
      });
    }
    if (Array.isArray(select)) {
      // string[] or Array<keyof T>
      return select as string[];
    }
    // object mapping: { column: alias }
    return Object.entries(select).map(([key, value]) => `${key}=${value}`);
  }

  /**
   * Performs a POST request to query data using query parameters in the request body.
   * Supports both JSON data retrieval and file downloads.
   * @param path - The path to the resource
   * @param params - Query parameters to be sent in the request body
   * @returns A promise that resolves to either a GetResponse containing data or a Blob for file downloads
   */
  async query<T>(path: string, params?: QueryParams<T>): Promise<GetResponse<T>> {
    try {
      const headers = await this.auth.getAuthHeaders();
      const url = this.getBackendUrl(`${path}/query`);

      const bodyParams = {
        ...params,
        select: params?.select ? this.serializeSelect(params.select) : undefined,
      };

      this.logRequest('POST', url, bodyParams);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyParams),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, url);
      }

      const data = await response.json();
      const recordCount = params?.recordCount
        ? Number(response.headers.get('Recordcount') ?? -1)
        : undefined;

      return { data, recordCount };
    } catch (error) {
      this.log('Request failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Performs a POST request to query data using query parameters in the request body.
   * Supports both JSON data retrieval and file downloads.
   * @param path - The path to the resource
   * @param params - Query parameters to be sent in the request body
   * @param fileType - Optional FileType to specify response format (CSV, or Excel)
   * @returns A promise that resolves to either a GetResponse containing data or a Blob for file downloads
   */
  async download(
    path: string,
    params?: QueryParams<any>,
    fileType: FileType = FileType.CSV,
  ): Promise<Blob> {
    try {
      const headers = await this.auth.getAuthHeaders(fileType);
      const url = this.getBackendUrl(`${path}/query`);

      const bodyParams = {
        ...params,
        select: params?.select ? this.serializeSelect(params.select) : undefined,
      };

      this.logRequest('POST', url, bodyParams);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyParams),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, url);
      }

      return await response.blob();
    } catch (error) {
      this.log('Request failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private async handleErrorResponse(response: Response, url: string): Promise<never> {
    const responseText = await response.text();
    const error = `Request failed: ${response.status} ${response.statusText}\nURL: ${url}\nResponse: ${responseText}`;
    if (this.debug) {
      console.error('[VystaClient]', error);
    }
    throw new Error(error);
  }
}
