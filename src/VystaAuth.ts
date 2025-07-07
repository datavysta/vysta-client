import { jwtDecode } from 'jwt-decode';

import { AuthResult, Principal, UserProfile, EnvironmentAvailable } from './types.js';

export enum TokenKey {
  AccessToken = 'accessToken',
  RefreshToken = 'refreshToken',
  Host = 'host',
  Expiration = 'expiration',
  Principal = 'principal',
}

const AUTH_ERRORS = {
  REFRESH_FAILED: 'Authentication refresh failed',
  NO_TOKENS: 'No tokens available for refresh',
  NOT_AUTHENTICATED: 'Not authenticated',
  ENVIRONMENT_ACCESS_DENIED: 'Access denied to target environment',
  ENVIRONMENT_SWITCH_FAILED: 'Environment switch failed',
  INVALID_EXCHANGE_TOKEN: 'Invalid or expired exchange token',
} as const;

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
    localStorage.setItem(key, JSON.stringify(value));
  }

  getToken(key: TokenKey): string | null {
    const json = localStorage.getItem(key);
    if (!json) {
      return null;
    }
    return JSON.parse(json);
  }

  clearTokens(): void {
    // Only clear auth-related keys, not all of localStorage
    Object.values(TokenKey).forEach(key => {
      localStorage.removeItem(key);
    });
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

export interface SignInInfo {
  id: string;
  name: string;
}

/** @internal */
export class VystaAuth {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiration: number | null = null;
  private host: string | null = null;
  private principal: Principal | null = null;
  /**
   * Host value explicitly provided by the SDK consumer. Only this value will
   * be forwarded with requests. Any host information returned by the backend
   * during authentication is stored but not automatically sent.
   */
  private manualHost: string | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly storage: TokenStorage = new DefaultStorage(),
    private readonly errorHandler: AuthErrorHandler = new DefaultErrorHandler(),
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
        headers: this.buildHeaders(),
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

  async getAuthHeaders(acceptType: string = 'application/json'): Promise<HeadersInit> {
    try {
      const token = await this.getAuthToken(true);
      if (!token) {
        throw new Error(AUTH_ERRORS.NOT_AUTHENTICATED);
      }

      return {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: acceptType, // Dynamically set Accept header
        ...(this.manualHost ? { 'X-DataVysta-Host': this.manualHost } : {}),
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
    const jwtExpire = this.expiration * 1000 - 7 * 1000; // Subtract 7 seconds for testing

    if (supportReauthenticate && now > jwtExpire) {
      return this.refreshAuth();
    }

    return this.accessToken;
  }

  async refreshAuth() {
    if (!this.accessToken || !this.refreshToken) {
      throw new Error(AUTH_ERRORS.NO_TOKENS);
    }
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/getrefreshtoken`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        this.clearAuth();
        throw new Error(AUTH_ERRORS.REFRESH_FAILED);
      }

      await this.reinitializeFromAuthenticationResult(result);
      return result.accessToken;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== AUTH_ERRORS.REFRESH_FAILED) {
        this.clearAuth();
      }
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

  async getSignInMethods(): Promise<SignInInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/auth/signininfos`, {
      headers: this.buildHeaders(null, 'application/json'),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch sign-in methods: ${response.statusText}`);
    }
    return response.json();
  }

  async getAuthorizeUrl(signInId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/auth/getauthorizeurl/${signInId}`, {
      method: 'POST',
      headers: this.buildHeaders('text/plain', 'text/plain'),
    });
    if (!response.ok) {
      throw new Error(`Failed to get authorize URL: ${response.statusText}`);
    }
    return response.text();
  }

  async handleAuthenticationRedirect(token: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/gettoken`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const authResult = await response.json();
      await this.reinitializeFromAuthenticationResult(authResult);
      return authResult;
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async exchangeToken(token: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/exchangeSwitchToken/${token}`);

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const authResult = await response.json();
      await this.reinitializeFromAuthenticationResult(authResult);
      return authResult;
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getUserProfile(): Promise<UserProfile> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/admin/security/userprofile`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get user profile: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Initiates a signup request for a new user.
   * @param email - The user's email address
   * @param redirectUrl - The URL to redirect the user after signup
   * @returns Resolves if the signup request was successful
   */
  async signup(email: string, redirectUrl: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({ email, redirectUrl }),
      });
      if (!response.ok) {
        throw new Error(`Signup failed: ${response.statusText}`);
      }
      // No body expected on success
      return;
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Sets or clears the host value used for the X-DataVysta-Host header.
   * This can be provided by the developer to force a specific host to be sent
   * with every request or cleared by passing null.
   */
  setHost(host: string | null): void {
    this.manualHost = host;
  }

  /**
   * Gets the list of available environments for the current user.
   * @returns Array of available environments grouped by tenant
   */
  async getAvailableEnvironments(): Promise<EnvironmentAvailable[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/restadmin/security/environment/available`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(AUTH_ERRORS.NOT_AUTHENTICATED);
        }
        throw new Error(`Failed to get available environments: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Initiates a switch to a different environment.
   * @param tenantId - The tenant ID of the target environment
   * @param environmentId - The environment ID to switch to
   * @returns Exchange token for completing the environment switch
   */
  async switchEnvironment(tenantId: string, environmentId: string): Promise<string> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/auth/switchEnvironment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tenantId,
          environmentId,
          accessToken: this.accessToken,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(AUTH_ERRORS.ENVIRONMENT_ACCESS_DENIED);
        }
        throw new Error(`${AUTH_ERRORS.ENVIRONMENT_SWITCH_FAILED}: ${response.statusText}`);
      }

      return response.json(); // Returns the exchange token as a JSON string
    } catch (error) {
      this.errorHandler.onError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Constructs the authentication redirect URL for environment switching.
   * @param exchangeToken - The exchange token received from switchEnvironment
   * @param targetHost - The target environment's host
   * @param redirectUrl - Optional redirect URL after authentication (defaults to current path)
   * @returns Complete authentication redirect URL
   */
  constructAuthenticationRedirectUrl(
    exchangeToken: string,
    targetHost: string,
    redirectUrl: string = window.location.pathname,
  ): string {
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : '';
    const encodedToken = encodeURIComponent(exchangeToken);
    const encodedRedirectUrl = encodeURIComponent(redirectUrl);

    return `${protocol}//${targetHost}${port}/vysta/authenticationRedirect?Token=${encodedToken}&RedirectUrl=${encodedRedirectUrl}`;
  }

  /**
   * Gets the current environment information from the user's principal.
   * @returns Current tenant and environment information, or null if not authenticated
   */
  getCurrentEnvironmentInfo(): { tenantId: string; envId: string } | null {
    if (!this.principal) {
      return null;
    }

    return {
      tenantId: this.principal.tenantId,
      envId: this.principal.envId,
    };
  }

  /**
   * Builds a basic headers object for unauthenticated requests, automatically
   * injecting the X-DataVysta-Host header when a manual host is provided.
   */
  private buildHeaders(
    contentType: string | null = 'application/json',
    accept: string | null = 'application/json',
  ): Record<string, string> {
    const headers: Record<string, string> = {};
    if (contentType) headers['Content-Type'] = contentType;
    if (accept) headers['Accept'] = accept;
    if (this.manualHost) headers['X-DataVysta-Host'] = this.manualHost;
    return headers;
  }
}
