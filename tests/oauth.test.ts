import { VystaClient } from '../src/VystaClient';
import { SignInInfo } from '../src/VystaAuth';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestClient } from './setup';

describe('OAuth Authentication', () => {
  let client: VystaClient;

  beforeEach(() => {
    client = new VystaClient({
      baseUrl: 'http://localhost:8080',
      errorHandler: { onError: () => {} }
    });
  });

  /*
  describe('getSignInMethods', () => {
    it('should fetch available sign-in methods', async () => {
      const methods = await client.getSignInMethods();
      expect(Array.isArray(methods)).toBe(true);
      expect(methods.length).toBeGreaterThan(0);
      expect(methods[0]).toHaveProperty('id');
      expect(methods[0]).toHaveProperty('name');
    });
  });
   */

  describe('getAuthorizeUrl', () => {
    /*
    it('should get authorization URL for provider', async () => {
      const methods = await client.getSignInMethods();
      const oktaProvider = methods.find(m => m.name.toLowerCase().includes('okta'));
      expect(oktaProvider).toBeDefined();

      const url = await client.getAuthorizeUrl(oktaProvider!.id);
      expect(typeof url).toBe('string');
      expect(url).toMatch(/^https?:\/\//); // Should be a valid URL
    });
     */

    it('should fail with invalid provider id', async () => {
      await expect(client.getAuthorizeUrl('invalid-id'))
        .rejects
        .toThrow();
    });
  });

  // We can't fully test handleAuthenticationRedirect without a valid token,
  // but we can test the error case
  describe('handleAuthenticationRedirect', () => {
    it('should fail with invalid token', async () => {
      await expect(client.handleAuthenticationRedirect('invalid-token'))
        .rejects
        .toThrow();
    });
  });
}); 