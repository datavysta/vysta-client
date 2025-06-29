import { describe, it, expect, beforeAll, jest } from '@jest/globals';

import { createTestClient, authenticateClient } from './setup';
import { VystaTimezoneService } from '../src/VystaTimezoneService';

// The test suite verifies that the VystaTimezoneService correctly
// retrieves available timezones from the backend and enforces
// authentication.

describe('VystaTimezoneService (integration)', () => {
  const client = createTestClient();
  const service = new VystaTimezoneService(client);

  beforeAll(async () => {
    // Authenticate once for the whole suite
    await authenticateClient(client);
  });

  it('fetches all available timezones', async () => {
    const timezones = await service.getAllTimezones();

    // Basic structural checks
    expect(Array.isArray(timezones)).toBe(true);
    expect(timezones.length).toBeGreaterThan(0);

    const tz = timezones[0];
    expect(tz).toHaveProperty('id');
    expect(typeof tz.id).toBe('string');
    expect(tz).toHaveProperty('displayName');
    expect(typeof tz.displayName).toBe('string');
  });

  it('throws when called without authentication', async () => {
    // Silence expected auth error logs to keep test output clean
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Ensure no residual tokens from previous tests
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    const unauthenticatedClient = createTestClient();
    const unauthenticatedService = new VystaTimezoneService(unauthenticatedClient);

    await expect(unauthenticatedService.getAllTimezones()).rejects.toThrow('Not authenticated');

    consoleSpy.mockRestore();
  });
}); 