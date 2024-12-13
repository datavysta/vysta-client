import { jwtDecode } from 'jwt-decode';
import { AuthResult, Principal } from './types';

interface JwtWithPrincipal {
  sub?: string;
  exp?: number;
}

export class VystaAuth {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiration: number | null = null;
  private host: string | null = null;
  private principal: Principal | null = null;

  constructor(
    private readonly baseUrl: string,
    private debug: boolean = false
  ) {}

  private getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Authenticates a user with the Vysta API
   * @param username - The user's email address
   * @param password - The user's password
   * @returns A promise that resolves to an AuthResult containing tokens and user info
   */
  async login(username: string, password: string): Promise<AuthResult> {
    const response = await fetch(`${this.getBaseUrl()}/api/auth/gettoken`, {
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
  }

  /**
   * Reinitializes the auth state from an authentication result
   * @param results - The authentication result containing tokens and user info
   */
  async reinitializeFromAuthenticationResult(results: AuthResult): Promise<void> {
    const jwt = jwtDecode<JwtWithPrincipal>(results.accessToken);
    const expiration: number = jwt.exp!;
    const principal: Principal = JSON.parse(jwt.sub!);

    this.accessToken = results.accessToken;
    this.refreshToken = results.refreshToken;
    this.host = results.host;
    this.expiration = expiration;
    this.principal = principal;

    sessionStorage.setItem('accessToken', this.accessToken);
    sessionStorage.setItem('refreshToken', this.refreshToken);
    if (this.host) {
      sessionStorage.setItem('host', this.host);
    }
    sessionStorage.setItem('expiration', expiration.toString());
    sessionStorage.setItem('principal', JSON.stringify(this.principal));
  }

  /**
   * Gets the authentication headers for API requests
   * @returns A promise that resolves to the headers object containing the auth token
   * @throws Error if not authenticated
   */
  async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken(true);
    if (!token) {
      throw new Error('Not authenticated');
    }

    return {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json'
    };
  }

  private async getAuthToken(supportReauthenticate: boolean): Promise<string | null> {
    if (!this.accessToken) {
      return null;
    }

    if (!this.expiration) {
      return null;
    }

    const now = Date.now();
    const jwtExpire = (this.expiration * 1000) - (60 * 1000); // Subtract 1 minute in milliseconds

    if (supportReauthenticate && now > jwtExpire) {
      return this.refreshAuth();
    }

    return this.accessToken;
  }

  private async refreshAuth(): Promise<string> {
    if (!this.accessToken || !this.refreshToken) {
      throw new Error('No tokens available for refresh');
    }

    const response = await fetch(`${this.getBaseUrl()}/api/auth/getrefreshtoken`, {
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
  }

  /**
   * Logs out the current user and clears all authentication data
   */
  async logout(): Promise<void> {
    this.clearAuth();
  }

  private clearAuth() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiration = null;
    this.host = null;
    this.principal = null;
    sessionStorage.clear();
  }
} 