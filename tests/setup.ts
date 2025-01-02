import fetch from 'cross-fetch';
import { VystaClient } from '../src/VystaClient';
import { AuthResult } from '../src/types';

// Add fetch to global scope for tests
global.fetch = fetch;

export function createTestClient(): VystaClient {
  return new VystaClient({
    baseUrl: 'http://localhost:8080',
    debug: false
  });
}

export async function authenticateClient(client: VystaClient): Promise<AuthResult> {
  return client.login('test@datavysta.com', 'password');
} 