import { describe, it, expect } from '@jest/globals';

import { VystaClient } from '../src/VystaClient.js';
import { TokenStorage, TokenKey } from '../src/VystaAuth';
import { PasswordResetStatus } from '../src/enums.js';
import { TEST_CONFIG } from './config';
import { Product } from '../examples/querying/types';

class TestStorage implements TokenStorage {
  private storage: Record<string, string> = {};

  setToken(key: TokenKey, token: string): void {
    this.storage[key] = token;
  }

  getToken(key: TokenKey): string | null {
    return this.storage[key] || null;
  }

  clearTokens(): void {
    this.storage = {};
  }
}

const createClient = () =>
  new VystaClient({
    baseUrl: TEST_CONFIG.baseUrl,
    errorHandler: { onError: () => {} },
    storage: new TestStorage(),
  });

const loginClient = async (client: VystaClient) => {
  return client.login(TEST_CONFIG.credentials.username, TEST_CONFIG.credentials.password);
};

describe('Authentication', () => {
  it.concurrent('should successfully login and store token', async () => {
    const client = createClient();
    const authResult = await loginClient(client);
    expect(authResult.accessToken).toBeDefined();
    expect(authResult.refreshToken).toBeDefined();

    const headers = (await client['auth'].getAuthHeaders()) as Record<string, string>;
    expect(headers['authorization']).toMatch(/^Bearer /);
  });

  it.concurrent('should fail with invalid credentials', async () => {
    const client = createClient();
    await expect(client.login('invalid@example.com', 'wrongpassword')).rejects.toThrow(
      'Login failed',
    );
  });

  it.concurrent('should clear auth on logout', async () => {
    const client = createClient();
    await loginClient(client);
    await client.logout();
    await expect(client.get('Northwinds/Products')).rejects.toThrow();
  });

  describe('Token Refresh', () => {
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    describe('Long Running Tests', () => {
      it.concurrent.skip(
        'should handle expired refresh token',
        async () => {
          const client = createClient();
          await loginClient(client);
          await wait(46000);
          await expect(client.get('Northwinds/Products', { limit: 1 })).rejects.toThrow(
            'Authentication refresh failed',
          );
          expect(client['auth'].isAuthenticated()).toBe(false);
          expect(client['auth'].getTokenExpiration()).toBeNull();
        },
        50000,
      );
    });

    describe('Quick Refresh Tests', () => {
      it.concurrent.skip(
        'should handle concurrent requests during refresh',
        async () => {
          const client = createClient();
          await loginClient(client);
          await wait(9000);

          const responses = await Promise.all([
            client.get<Product>('Northwinds/Products', { limit: 1 }),
            client.get<Product>('Northwinds/Products', { limit: 2 }),
            client.get<Product>('Northwinds/Products', { limit: 3 }),
          ]);

          responses.forEach((response, index) => {
            expect((response.data as Product[]).length).toBe(index + 1);
          });
          expect(client['auth'].getTokenExpiration()).toBeGreaterThan(0);
        },
        15000,
      );

      it.concurrent.skip(
        'should handle refresh at boundary',
        async () => {
          const client = createClient();
          await loginClient(client);

          const initialHeaders = (await client['auth'].getAuthHeaders()) as Record<string, string>;
          const initialToken = initialHeaders['authorization'];

          await wait(9000);

          const beforeRequest = Math.floor(Date.now() / 1000);
          const response = await client.get('Northwinds/Products', { limit: 1 });
          const newHeaders = (await client['auth'].getAuthHeaders()) as Record<string, string>;

          expect(response.data).toBeDefined();
          expect(newHeaders['authorization']).not.toBe(initialToken);
          expect(client['auth'].getTokenExpiration()!).toBeGreaterThan(beforeRequest + 13);
        },
        15000,
      );
    });
  });

  describe('getUserProfile', () => {
    it('should fetch user profile when authenticated', async () => {
      const client = createClient();
      await loginClient(client);

      const profile = await client.getUserProfile();

      expect(profile.name).toBe('Test');
    });

    it('should fail when not authenticated', async () => {
      const client = createClient();

      await expect(client.getUserProfile()).rejects.toThrow();
    });
  });

  describe('Signup', () => {
    it.skip('should successfully send a signup request (200 OK, no body)', async () => {
      const client = createClient();
      // Use a unique email to avoid conflicts in real systems
      const email = `test+${Date.now()}@example.com`;
      const redirectUrl = 'https://example.com/redirect';
      await expect(client['auth'].signup(email, redirectUrl)).resolves.toBeUndefined();
    });
  });

  describe('Password Reset and Invitation Flow', () => {
    const testEmail = 'test@example.com';
    const testPassword = 'newPassword123';
    const testInvitationId = 'test-invitation-uuid';
    const testResetCode = 'test-reset-code';

    describe('forgotPassword', () => {
      it.skip('should initiate password reset request', async () => {
        const client = createClient();
        const response = await client.forgotPassword(testEmail);
        expect(response).toHaveProperty('exists');
      });

      it('should validate method exists and has correct signature', () => {
        const client = createClient();
        expect(typeof client.forgotPassword).toBe('function');
      });
    });

    describe('validateCode', () => {
      it.skip('should validate password reset code', async () => {
        const client = createClient();
        const response = await client.validateCode({
          email: testEmail,
          code: testResetCode,
        });
        expect(response).toHaveProperty('status');
      });

      it('should validate method exists and has correct signature', () => {
        const client = createClient();
        expect(typeof client.validateCode).toBe('function');
      });
    });

    describe('validateInvitation', () => {
      it.skip('should validate invitation', async () => {
        const client = createClient();
        const response = await client.validateInvitation({
          id: testInvitationId,
        });
        expect(response).toHaveProperty('status');
      });

      it('should validate method exists and has correct signature', () => {
        const client = createClient();
        expect(typeof client.validateInvitation).toBe('function');
      });
    });

    describe('changePassword', () => {
      it.skip('should change password successfully', async () => {
        const client = createClient();
        const response = await client.changePassword({
          email: testEmail,
          code: testResetCode,
          password: testPassword,
          passwordConfirmed: testPassword,
        });
        expect(response).toHaveProperty('status');
      });

      it('should validate method exists and has correct signature', () => {
        const client = createClient();
        expect(typeof client.changePassword).toBe('function');
      });
    });

    describe('acceptInvitation', () => {
      it.skip('should accept invitation successfully', async () => {
        const client = createClient();
        const response = await client.acceptInvitation({
          id: testInvitationId,
          password: testPassword,
          passwordConfirmed: testPassword,
        });
        expect(response).toHaveProperty('status');
      });

      it('should validate method exists and has correct signature', () => {
        const client = createClient();
        expect(typeof client.acceptInvitation).toBe('function');
      });
    });

    describe('Types and Enums', () => {
      it('should export PasswordResetStatus enum', () => {
        expect(PasswordResetStatus.VALID).toBe(0);
        expect(PasswordResetStatus.EXPIRED).toBe(1);
        expect(PasswordResetStatus.NOT_FOUND).toBe(2);
        expect(PasswordResetStatus.INVALID_CODE).toBe(3);
        expect(PasswordResetStatus.COMPLETED).toBe(4);
        expect(PasswordResetStatus.PASSWORDS_MUST_MATCH).toBe(5);
        expect(PasswordResetStatus.PASSWORD_REUSED).toBe(6);
      });
    });
  });
});
