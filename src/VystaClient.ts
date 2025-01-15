import { VystaAuth, TokenStorage, AuthErrorHandler, SignInInfo } from './VystaAuth.js';
import { AuthResult } from './types.js';
import type { QueryParams, FilterCondition } from './types.js';

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

    if (params.select && params.select.length) {
      queryParts.push(`select=${params.select.join(',')}`);
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

    if (params.offset !== undefined) {
      queryParts.push(`offset=${params.offset}`);
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
   */
  async get<T>(path: string, params?: QueryParams<T>): Promise<GetResponse<T>> {
    try {
      const headers = await this.auth.getAuthHeaders();
      const url = `${this.config.baseUrl}/api/rest/connections/${path}${this.buildQueryString(params)}`;
      
      this.logRequest('GET', url);

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, url);
      }

      const data = await response.json();
      const recordCount = params?.recordCount ? Number(response.headers.get('Recordcount') ?? -1) : undefined;

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
   * @returns A promise that resolves to the created item
   */
  async post<T>(path: string, data: T): Promise<T> {
    const headers = await this.auth.getAuthHeaders();
    const url = `${this.config.baseUrl}/api/rest/connections/${path}`;
    
    this.logRequest('POST', url, data);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, url);
    }

    return response.json();
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
    const url = `${this.config.baseUrl}/api/rest/connections/${path}${this.buildQueryString(params)}`;
    
    this.logRequest('PATCH', url, data);

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, url);
    }

    return Number(response.headers.get('AffectedRows') || '0');
  }

  /**
   * Performs a DELETE request to remove data
   * @param path - The path to the resource
   * @param params - Optional query parameters to filter what gets deleted
   * @returns A promise that resolves to the number of affected rows
   */
  async delete(path: string, params?: QueryParams<any>): Promise<number> {
    const headers = await this.auth.getAuthHeaders();
    const url = `${this.config.baseUrl}/api/rest/connections/${path}${this.buildQueryString(params)}`;
    
    this.logRequest('DELETE', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers
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

  private async handleErrorResponse(response: Response, url: string): Promise<never> {
    const responseText = await response.text();
    const error = `Request failed: ${response.status} ${response.statusText}\nURL: ${url}\nResponse: ${responseText}`;
    if (this.debug) {
      console.error('[VystaClient]', error);
    }
    throw new Error(error);
  }
} 