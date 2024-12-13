import { VystaClient } from '../src/VystaClient';
import { TEST_CONFIG } from './config';

describe('Authentication', () => {
  let client: VystaClient;

  beforeEach(() => {
    client = new VystaClient({
      baseUrl: TEST_CONFIG.baseUrl,
      debug: false
    });
  });

  it('should successfully login', async () => {
    const authResult = await client.login(
      TEST_CONFIG.credentials.username,
      TEST_CONFIG.credentials.password
    );

    expect(authResult).toBeDefined();
    expect(authResult.accessToken).toBeDefined();
    expect(authResult.refreshToken).toBeDefined();
  });

  it('should fail with invalid credentials', async () => {
    await expect(
      client.login('wrong@email.com', 'wrongpassword')
    ).rejects.toThrow();
  });

  it('should clear auth on logout', async () => {
    await client.login(
      TEST_CONFIG.credentials.username,
      TEST_CONFIG.credentials.password
    );
    
    await client.logout();
    
    // Try to make an authenticated request
    await expect(
      client.get('Northwinds/products')
    ).rejects.toThrow();
  });

  it('should store auth token after login', async () => {
    await client.login(TEST_CONFIG.credentials.username, TEST_CONFIG.credentials.password);
    
    const headers = await client['auth'].getAuthHeaders() as Record<string, string>;
    const authHeader = headers['authorization'];
    
    expect(authHeader).toBeTruthy();
    expect(authHeader).toMatch(/^Bearer /);
  });

  it('should return correct auth headers', async () => {
    await client.login(TEST_CONFIG.credentials.username, TEST_CONFIG.credentials.password);
    
    const headers = await client['auth'].getAuthHeaders() as Record<string, string>;
    
    expect(headers['content-type']).toBe('application/json');
    expect(headers['authorization']).toMatch(/^Bearer /);
  });

  it('should clear storage on logout', async () => {
    await client.login(TEST_CONFIG.credentials.username, TEST_CONFIG.credentials.password);
    await client.logout();
    
    await expect(
      client['auth'].getAuthHeaders()
    ).rejects.toThrow('Not authenticated');
  });
}); 