import { ProductService, SupplierService } from '../examples/querying/services';
import { createTestClient, authenticateClient } from './setup';

describe('Query Operations', () => {
  const client = createTestClient(false);
  let products: ProductService;
  let suppliers: SupplierService;

  beforeAll(() => {
    products = new ProductService(client);
    suppliers = new SupplierService(client);
  });

  beforeEach(async () => {
    await authenticateClient(client);
  });

  describe('Comparison Operators', () => {
    it('eq - equals', async () => {
      const result = await products.getAll({
        select: ['product_id', 'discontinued'],
        filters: {
          discontinued: { eq: 0 }
        }
      });
      expect(result[0].discontinued).toBe(0);
    });

    it('gt - greater than', async () => {
      const result = await products.getAll({
        select: ['product_id', 'unit_price'],
        filters: {
          unit_price: { gt: 20 }
        }
      });
      expect(result[0].unit_price).toBeGreaterThan(20);
    });

    it('gte - greater than or equal', async () => {
      const result = await products.getAll({
        select: ['product_id', 'unit_price'],
        filters: {
          unit_price: { gte: 20 }
        }
      });
      expect(result[0].unit_price).toBeGreaterThanOrEqual(20);
    });

    it('lt - less than', async () => {
      const result = await products.getAll({
        select: ['product_id', 'unit_price'],
        filters: {
          unit_price: { lt: 10 }
        }
      });
      expect(result[0].unit_price).toBeLessThan(10);
    });

    it('lte - less than or equal', async () => {
      const result = await products.getAll({
        select: ['product_id', 'unit_price'],
        filters: {
          unit_price: { lte: 10 }
        }
      });
      expect(result[0].unit_price).toBeLessThanOrEqual(10);
    });
  });

  describe('Array Operators', () => {
    it.skip('in - included in array', async () => {
      const result = await products.getAll({
        select: ['product_id', 'category_id'],
        filters: {
          category_id: { in: [1, 2] }
        }
      });
      expect([1, 2]).toContain(result[0].category_id);
    });

    it.skip('nin - not included in array', async () => {
      const result = await products.getAll({
        select: ['product_id', 'category_id'],
        filters: {
          category_id: { nin: [1, 2] }
        }
      });
      expect([1, 2]).not.toContain(result[0].category_id);
    });
  });

  describe('Null Operators', () => {
    it('isnull - is null', async () => {
      const result = await suppliers.getAll({
        select: ['supplier_id', 'region'],
        filters: {
          region: { isnull: true }
        }
      });
      expect(result[0].region).toBeNull();
    });

    it('isnotnull - is not null', async () => {
      const result = await products.getAll({
        select: ['product_id', 'product_name'],
        filters: {
          product_name: { isnotnull: true }
        }
      });
      expect(result[0].product_name).toBeTruthy();
    });
  });

  describe('String Pattern Operators', () => {
    it('like - pattern matching', async () => {
      const result = await products.getAll({
        select: ['product_id', 'product_name'],
        filters: {
          product_name: { like: '%Aniseed%' }
        }
      });
      expect(result[0].product_name).toMatch(/Aniseed/i);
      expect(result[0].product_name).toBe('Aniseed Syrup');
    });

    it('nlike - negative pattern matching', async () => {
      const result = await products.getAll({
        select: ['product_id', 'product_name'],
        filters: {
          product_name: { nlike: '%Chai%' }
        }
      });
      expect(result[0].product_name).not.toMatch(/Chai/i);
    });
  });

  describe('Error Handling', () => {
    it('returns empty array for non-existent records', async () => {
      const result = await suppliers.getAll({
        select: ['supplier_id', 'company_name'],
        filters: {
          company_name: { eq: 'NON_EXISTENT_SUPPLIER' }
        }
      });
      expect(result).toEqual([]);
    });
  });
}); 