import { jwtDecode } from 'jwt-decode';
import { AuthResult, Principal } from './types';

export enum TokenKey {
  AccessToken = 'accessToken',
  RefreshToken = 'refreshToken',
  Host = 'host',
  Expiration = 'expiration',
  Principal = 'principal'
}

export interface TokenStorage {
  setToken(key: TokenKey, value: string): void;
  getToken(key: TokenKey): string | null;
  clearTokens(): void;
}

export interface AuthErrorHandler {
  onError(error: Error): void;
}

class DefaultStorage implements TokenStorage {
  setToken(key: TokenKey, value: string): void {
    sessionStorage.setItem(key, value);
  }

  getToken(key: TokenKey): string | null {
    return sessionStorage.getItem(key);
  }

  clearTokens(): void {
    sessionStorage.clear();
  }
}

class DefaultErrorHandler implements AuthErrorHandler {
  onError(error: Error): void {
    console.error('[VystaAuth]', error);
  }
}

interface JwtWithPrincipal {
  sub?: string;
  exp?: number;
}

/** @internal */
export class VystaAuth {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiration: number | null = null;
  private host: string | null = null;
  private principal: Principal | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly storage: TokenStorage = new DefaultStorage(),
    private readonly errorHandler: AuthErrorHandler = new DefaultErrorHandler()
  ) {
    this.initializeFromStorage();
  }

  private async initializeFromStorage(): Promise<void> {
    const accessToken = this.storage.getToken(TokenKey.AccessToken);
    const refreshToken = this.storage.getToken(TokenKey.RefreshToken);
    const host = this.storage.getToken(TokenKey.Host);
    const expiration = this.storage.getToken(TokenKey.Expiration);
    const principalStr = this.storage.getToken(TokenKey.Principal);

    if (accessToken && refreshToken && expiration && principalStr) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.host = host;
      this.expiration = parseInt(expiration, 10);
      this.principal = JSON.parse(principalStr);
    }
  }

  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/gettoken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const authResult = await response.json();
      await this.reinitializeFromAuthenticationResult(authResult);
      return authResult;
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async reinitializeFromAuthenticationResult(results: AuthResult): Promise<void> {
    const jwt = jwtDecode<JwtWithPrincipal>(results.accessToken);
    const expiration: number = jwt.exp!;
    const principal: Principal = JSON.parse(jwt.sub!);

    this.accessToken = results.accessToken;
    this.refreshToken = results.refreshToken;
    this.host = results.host;
    this.expiration = expiration;
    this.principal = principal;

    this.storage.setToken(TokenKey.AccessToken, this.accessToken);
    this.storage.setToken(TokenKey.RefreshToken, this.refreshToken);
    if (this.host) {
      this.storage.setToken(TokenKey.Host, this.host);
    }
    this.storage.setToken(TokenKey.Expiration, expiration.toString());
    this.storage.setToken(TokenKey.Principal, JSON.stringify(this.principal));
  }

  async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const token = await this.getAuthToken(true);
      if (!token) {
        throw new Error('Not authenticated');
      }

      return {
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json'
      };
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null && this.expiration !== null;
  }

  /** @internal For testing purposes only */
  getTokenExpiration(): number | null {
    return this.expiration;
  }

  private async getAuthToken(supportReauthenticate: boolean): Promise<string | null> {
    if (!this.accessToken) {
      return null;
    }

    if (!this.expiration) {
      return null;
    }

    const now = Date.now();
    const jwtExpire = (this.expiration * 1000) - (7 * 1000); // Subtract 7 seconds for testing

    if (supportReauthenticate && now > jwtExpire) {
      return this.refreshAuth();
    }

    return this.accessToken;
  }

  private async refreshAuth(): Promise<string> {
    if (!this.accessToken || !this.refreshToken) {
      throw new Error('No tokens available for refresh');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/getrefreshtoken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken
        })
      });

      if (!response.ok) {
        this.clearAuth();
        throw new Error('Authentication refresh failed');
      }

      const result = await response.json();
      await this.reinitializeFromAuthenticationResult(result);
      return result.accessToken;
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  logout(): void {
    this.clearAuth();
  }

  private clearAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiration = null;
    this.host = null;
    this.principal = null;
    this.storage.clearTokens();
  }
} 