import fetch from 'cross-fetch';
import { jest } from '@jest/globals';
import { VystaClient } from '../src/VystaClient';
import { TEST_CONFIG } from './config';

const storageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn((i: number) => ''),
  };
})();

Object.defineProperty(global, 'sessionStorage', { value: storageMock });
global.fetch = fetch;

export function createTestClient(debug: boolean = false): VystaClient {
  return new VystaClient({
    baseUrl: TEST_CONFIG.baseUrl,
    debug
  });
}

export async function authenticateClient(client: VystaClient): Promise<void> {
  await client.login(TEST_CONFIG.credentials.username, TEST_CONFIG.credentials.password);
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  sessionStorage.clear();
}); 