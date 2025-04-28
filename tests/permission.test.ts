import { describe, it, expect, beforeAll } from '@jest/globals';
import { VystaPermissionService } from '../src/base/VystaPermissionService';
import { createTestClient, authenticateClient } from './setup';

// These should match real objects in your test DB
const CONNECTION = 'Northwinds';
const TABLE = 'region';
const VIEW = 'newview';
const QUERY = 'working';

let client: ReturnType<typeof createTestClient>;
let permissions: VystaPermissionService;

beforeAll(async () => {
  client = createTestClient();
  await authenticateClient(client);
  permissions = new VystaPermissionService(client);
});

describe('VystaPermissionService (integration)', () => {
  it('fetches connection permissions', async () => {
    const result = await permissions.getConnectionPermissions(CONNECTION);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('children');
    expect(result).toHaveProperty('where');
    expect(result).toHaveProperty('grants');
  });

  it('fetches table permissions', async () => {
    const result = await permissions.getTablePermissions(CONNECTION, TABLE);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('children');
    expect(result).toHaveProperty('where');
    expect(result).toHaveProperty('grants');
  });

  it('fetches view permissions', async () => {
    const result = await permissions.getViewPermissions(CONNECTION, VIEW);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('children');
    expect(result).toHaveProperty('where');
    expect(result).toHaveProperty('grants');
  });

  it('fetches query permissions', async () => {
    const result = await permissions.getQueryPermissions(CONNECTION, QUERY);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('children');
    expect(result).toHaveProperty('where');
    expect(result).toHaveProperty('grants');
  });

  // Add similar tests for procedure, workflow, filesystem as needed
}); 