import { ProductService, SupplierService } from '../examples/querying/services';
import { createTestClient, authenticateClient } from './setup';

describe('Query Operations', () => {
  const client = createTestClient();
  let products: ProductService;
  let suppliers: SupplierService;

  beforeAll(async () => {
    await authenticateClient(client);
    products = new ProductService(client);
    suppliers = new SupplierService(client);
  });

  beforeEach(async () => {
    await authenticateClient(client);
  });

  describe('Basic Operations', () => {
    it('should get all products', async () => {
      const allProducts = await products.getAll({
        recordCount: true
      });

      // More specific array checks
      expect(typeof allProducts.data).toBe('object');
      expect(allProducts.data.constructor.name).toBe('Array');
      expect(Array.isArray(allProducts.data)).toBe(true);
      expect(allProducts.data.length).toBeGreaterThan(0);
      expect(allProducts.count).toBeGreaterThan(0);
      expect(allProducts.error).toBeNull();
      
      // Check first item structure
      const firstItem = allProducts.data[0];
      expect(typeof firstItem).toBe('object');
      expect(firstItem).not.toBeNull();
    });

    it('should get product by id', async () => {
      const productId = 1;
      const product = await products.getById(productId);
      expect(product).not.toBeNull();
      expect(product.productId).toBe(productId);
      expect(typeof product.productName).toBe('string');
    });
  });

  describe('Comparison Operators', () => {
    it('eq - equals', async () => {
      const result = await products.getAll({
        select: ['productId', 'discontinued'],
        filters: {
          discontinued: { eq: 0 }
        }
      });
      expect(result.data[0].discontinued).toBe(0);
    });

    it('gt - greater than', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { gt: 20 }
        }
      });
      expect(result.data[0].unitPrice).toBeGreaterThan(20);
    });

    it('gte - greater than or equal', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { gte: 20 }
        }
      });
      expect(result.data[0].unitPrice).toBeGreaterThanOrEqual(20);
    });

    it('lt - less than', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { lt: 10 }
        }
      });
      expect(result.data[0].unitPrice).toBeLessThan(10);
    });

    it('lte - less than or equal', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { lte: 10 }
        }
      });
      expect(result.data[0].unitPrice).toBeLessThanOrEqual(10);
    });
  });

  describe('Array Operators', () => {
    it.skip('in - included in array', async () => {
      const result = await products.getAll({
        select: ['productId', 'categoryId'],
        filters: {
          categoryId: { in: [1, 2] }
        }
      });
      expect([1, 2]).toContain(result.data[0].categoryId);
    });

    it.skip('nin - not included in array', async () => {
      const result = await products.getAll({
        select: ['productId', 'categoryId'],
        filters: {
          categoryId: { nin: [1, 2] }
        }
      });
      expect([1, 2]).not.toContain(result.data[0].categoryId);
    });
  });

  describe('Null Operators', () => {
    it('isnull - is null', async () => {
      const result = await suppliers.getAll({
        select: ['supplierId', 'region'],
        filters: {
          region: { isnull: true }
        },
        recordCount: true
      });
      expect(result.count).toBeGreaterThan(0);
      expect(result.data[0].region).toBeUndefined();
    });

    it('isnotnull - is not null', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        filters: {
          productName: { isnotnull: true }
        }
      });
      expect(result.data[0].productName).toBeTruthy();
    });
  });

  describe('String Pattern Operators', () => {
    it('like - pattern matching', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        filters: {
          productName: { like: '%Aniseed%' }
        }
      });
      expect(result.data[0].productName).toMatch(/Aniseed/i);
      expect(result.data[0].productName).toBe('Aniseed Syrup');
    });

    it('nlike - negative pattern matching', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        filters: {
          productName: { nlike: '%Chai%' }
        }
      });
      expect(result.data[0].productName).not.toMatch(/Chai/i);
    });
  });

  describe('Error Handling', () => {
    it('returns empty array for non-existent records', async () => {
      const result = await suppliers.getAll({
        select: ['supplierId', 'companyName'],
        recordCount: true,
        filters: {
          companyName: { eq: 'NON_EXISTENT_SUPPLIER' }
        }
      });
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.error).toBeNull();
    });
  });

  describe('Search Query', () => {
    it('q - full text search', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        q: 'chai'
      });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].productName.toLowerCase()).toContain('chai');
    });

    it('q - combines with other filters', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName', 'unitPrice'],
        q: 'tea',
        filters: {
          unitPrice: { gt: 9 }
        }
      });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].productName.toLowerCase()).toContain('tea');
      expect(result.data[0].unitPrice).toBeGreaterThan(9);
    });

    it('q - returns empty array for non-matching search', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        q: 'nonexistentproduct123456789',
        recordCount: true
      });
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });
}); 