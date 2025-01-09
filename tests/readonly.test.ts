import { describe, it, expect, beforeAll } from '@jest/globals';
import { VystaReadonlyService } from '../src/base/VystaReadonlyService';
import { createTestClient, authenticateClient } from './setup';

interface CustomerSummary {
  customerId?: string;
  count?: number;
  companyName?: string;
}

class CustomerSummaryService extends VystaReadonlyService<CustomerSummary> {
  constructor(client: any) {
    super(client, 'Northwinds', 'CustomerSummary');
  }
}

describe('VystaReadonlyService', () => {
  const client = createTestClient();
  let summaries: CustomerSummaryService;

  beforeAll(async () => {
    await authenticateClient(client);
    summaries = new CustomerSummaryService(client);
  });

  describe('Read Operations', () => {
    it('should get all records', async () => {
      const result = await summaries.getAll();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });

    it('should get filtered records', async () => {
      const result = await summaries.getAll({
        filters: {
          count: { gt: 0 }
        }
      });
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });

    it('should get records with pagination', async () => {
      const result = await summaries.getAll({
        limit: 5,
        offset: 0
      });
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.error).toBeNull();
    });

    it('should get records with sorting', async () => {
      const result = await summaries.getAll({
        order: {
          companyName: 'asc'
        }
      });
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });
  });
}); 