import {AuthErrorHandler, SignInInfo, TokenStorage, VystaAuth} from './VystaAuth.js';
import type {FilterCondition, QueryParams, UserProfile} from './types.js';
import {AuthResult, FileType} from './types.js';

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
  private readonly BASE_API_PATH = '/api/rest/connections/';

  constructor(private config: VystaConfig) {
    this.debug = config.debug || false;
    this.auth = new VystaAuth(
      this.config.baseUrl,
      config.storage,
      config.errorHandler
    );
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

  private buildQueryString(params?: QueryParams<any>): string {
    if (!params) return '';

    const queryParts: string[] = [];

    if (params.select && Object.keys(params.select).length) {
      if (Array.isArray(params.select)) {
        queryParts.push(`select=${params.select.join(',')}`);
      } else {
        const mappedSelect = Object.entries(params.select)
            .map(([key, value]) => `${key}=${value}`)
            .join(',');
        queryParts.push(`select=${mappedSelect}`);
      }
    }

    if (params.filters) {
      Object.entries(params.filters).forEach(([field, conditions]) => {
        if (conditions) {
          Object.entries(conditions as FilterCondition).forEach(([operator, value]) => {
            const encodedValue = (operator === 'like' || operator === 'nlike')
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

  private buildUrl(path: string, params?: QueryParams<any>): string {
    return `${this.config.baseUrl}${this.BASE_API_PATH}${path}${this.buildQueryString(params)}`;
  }

  private async makeRequest<T>(
    method: string,
    path: string,
    options: {
      params?: QueryParams<any>;
      body?: any;
      acceptType?: string;
      isQuery?: boolean;
    } = {}
  ): Promise<{ data: T; headers: Headers }> {
    try {
      const { params, body, acceptType, isQuery } = options;
      const headers = await this.auth.getAuthHeaders(acceptType);
      const url = this.buildUrl(isQuery ? `${path}/query` : path, params);

      this.logRequest(method, url, body);

      const response = await fetch(url, {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) })
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, url);
      }

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : [];
      return { data, headers: response.headers };
    } catch (error) {
      this.log('Request failed:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private getRecordCount(headers: Headers, params?: QueryParams<any>): number | undefined {
    return params?.recordCount ? Number(headers.get('Recordcount') ?? -1) : undefined;
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
    if (params?.conditions) {
      throw new Error('Use query() method for queries with conditions');
    }

    const { data, headers } = await this.makeRequest<T[]>('GET', path, { params });
    return { 
      data,
      recordCount: this.getRecordCount(headers, params)
    };
  }

  /**
   * Performs a POST request to create new data
   * @param path - The path to the resource
   * @param data - The data to create
   * @returns A promise that resolves to the created item
   */
  async post<T>(path: string, data: T): Promise<T> {
    const { data: responseData } = await this.makeRequest<T>('POST', path, { body: data });
    return responseData;
  }

  /**
   * Performs a PATCH request to update existing data
   * @param path - The path to the resource
   * @param data - The data to update
   * @param params - Optional query parameters to filter what gets updated
   * @returns A promise that resolves to the number of affected rows
   */
  async patch<T>(path: string, data: Partial<T>, params?: QueryParams<T>): Promise<number> {
    const { headers } = await this.makeRequest('PATCH', path, { params, body: data });
    return Number(headers.get('AffectedRows') || '0');
  }

  /**
   * Performs a DELETE request to remove data
   * @param path - The path to the resource
   * @param params - Optional query parameters to filter what gets deleted
   * @returns A promise that resolves to the number of affected rows
   */
  async delete(path: string, params?: QueryParams<any>): Promise<number> {
    const { headers } = await this.makeRequest('DELETE', path, { params });
    return Number(headers.get('AffectedRows') || '0');
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

  /**
   * Performs a POST request to query data using query parameters in the request body.
   * Supports both JSON data retrieval and file downloads.
   * @param path - The path to the resource
   * @param params - Query parameters to be sent in the request body
   * @returns A promise that resolves to either a GetResponse containing data or a Blob for file downloads
   */
  async query<T>(path: string, params?: QueryParams<T>): Promise<GetResponse<T>> {
    const { data, headers } = await this.makeRequest<T[]>(
      'POST',
      path,
      { 
        body: params || {},
        isQuery: true
      }
    );
    
    return { 
      data,
      recordCount: this.getRecordCount(headers, params)
    };
  }

  /**
   * Performs a POST request to query data using query parameters in the request body.
   * Supports both JSON data retrieval and file downloads.
   * @param path - The path to the resource
   * @param params - Query parameters to be sent in the request body
   * @param fileType - Optional FileType to specify response format (CSV, or Excel)
   * @returns A promise that resolves to either a GetResponse containing data or a Blob for file downloads
   */
  async download(path: string, params?: QueryParams<any>, fileType: FileType = FileType.CSV): Promise<Blob> {
    const headers = await this.auth.getAuthHeaders(fileType);
    const url = this.buildUrl(`${path}/query`);
    
    this.logRequest('POST', url, params);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params || {})
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, url);
    }

    return response.blob();
  }

  private async handleErrorResponse(response: Response, url: string): Promise<never> {
    const contentType = response.headers.get('content-type');
    let error;
    if (contentType && contentType.includes('application/json')) {
      error = await response.json();
    } else {
      error = await response.text();
    }
    const errorMessage = `Request failed: ${response.status} ${response.statusText}\nURL: ${url}\nResponse: ${JSON.stringify(error)}`;
    if (this.debug) {
      console.error('[VystaClient]', errorMessage);
    }
    throw new Error(errorMessage);
  }
} 