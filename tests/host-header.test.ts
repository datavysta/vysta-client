import { describe, it, expect, beforeAll, jest } from '@jest/globals';

import { createTestClient, authenticateClient } from './setup';
import { VystaClient } from '../src/VystaClient.js';
import { VystaService } from '../src/base/VystaService.js';

const HELLOWORLD = 'helloworld';

class HelloworldService extends VystaService<any> {
  constructor(client: VystaClient) {
    super(client, HELLOWORLD, HELLOWORLD, { primaryKey: [] });
  }
}

let client: VystaClient;

describe.skip('Custom Host Header – helloworld', () => {
  beforeAll(async () => {
    client = createTestClient();
    // All requests (including auth) should be tagged with helloworld host
    client.setHost(HELLOWORLD);
    await authenticateClient(client);
  });

  it('should successfully query the helloworld table (may be empty)', async () => {
    const svc = new HelloworldService(client);
    const result = await svc.getAll({ limit: 1 });

    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
    // Table might be empty; ensure no error occurred
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  });
}); 