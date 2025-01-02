import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { ProductService } from '../examples/querying/services';
import { Product } from '../examples/querying/types';
import { createTestClient, authenticateClient } from './setup';

describe('CRUD Operations', () => {
  const client = createTestClient();
  let products: ProductService;
  let testProduct: Product;
  const TEST_PRODUCTS = [78, 200, 201];

  beforeAll(async () => {
    await authenticateClient(client);
    products = new ProductService(client);
  });

  afterAll(async () => {
    // Cleanup all test products
    await Promise.all(
      TEST_PRODUCTS.map(async (id) => {
        try {
          await products.delete(id);
        } catch (e) {
          // Ignore if product doesn't exist
        }
      })
    );
  });

  describe('Create', () => {
    it('should create a new product with ID 78', async () => {
      // First verify product doesn't exist
      const initialCheck = await products.getAll({
        filters: { productId: { eq: 78 } }
      });
      expect(initialCheck.data.length).toBe(0);

      // Create the product
      const newProduct = {
        productId: 78,
        productName: 'Test Product',
        unitPrice: 29.99,
        unitsInStock: 100,
        discontinued: 0
      };

      await products.create(newProduct);

      // Verify product was created and store for later tests
      const createdProduct = await products.getById(78);
      expect(createdProduct.productId).toBe(78);
      expect(createdProduct.productName).toBe(newProduct.productName);
      testProduct = createdProduct;
    });
  });

  describe('Read', () => {
    it('should get product by id', async () => {
      const product = await products.getById(testProduct.productId);
      expect(product.productName).toBe('Test Product');
    });

    it('should get all products', async () => {
      const allProducts = await products.getAll();
      expect(Array.isArray(allProducts.data)).toBe(true);
      expect(allProducts.data.length).toBeGreaterThan(0);
      expect(allProducts.count).toBeGreaterThan(0);
      expect(allProducts.error).toBeNull();
    });
  });

  describe('Update', () => {
    it('should update a product', async () => {
      const updates = {
        productName: 'Updated Test Product',
        unitPrice: 39.99
      };

      const affected = await products.update(testProduct.productId, updates);
      expect(affected).toBe(1);

      const updated = await products.getById(testProduct.productId);
      expect(updated.productName).toBe(updates.productName);
      expect(updated.unitPrice).toBe(updates.unitPrice);
    });

    it('should update multiple products', async () => {
      const affected = await products.updateWhere(
        { filters: { discontinued: { eq: 0 } } },
        { unitsInStock: 0 }
      );
      expect(affected).toBeGreaterThan(0);

      const result = await products.getAll({
        filters: {
          discontinued: { eq: 0 },
          unitsInStock: { eq: 0 }
        }
      });

      expect(result.data.length).toBe(affected);
      result.data.forEach(product => {
        expect(product.unitsInStock).toBe(0);
      });
    });
  });

  describe('Delete', () => {
    it('should delete a product', async () => {
      const affected = await products.delete(testProduct.productId);
      expect(affected).toBe(1);
      
      const result = await products.getAll({
        filters: {
          productId: { eq: testProduct.productId }
        }
      });
      
      expect(result.data.length).toBe(0);
    });

    it('should delete multiple products', async () => {
      // Create test products
      const testProducts = await Promise.all([
        products.create({ productId: 200, productName: 'Test 1', unitPrice: 1234.56, discontinued: 1 }),
        products.create({ productId: 201, productName: 'Test 2', unitPrice: 1234.56, discontinued: 1 })
      ]);

      // Delete all discontinued products
      const affected = await products.deleteWhere({
        filters: {
          unitPrice: { eq: 1234.56 }
        }
      });
      expect(affected).toBe(2);

      // Verify deletion of both products
      const results = await Promise.all([
        products.getAll({
          filters: { productId: { eq: 200 } }
        }),
        products.getAll({
          filters: { productId: { eq: 201 } }
        })
      ]);

      expect(results[0].data.length).toBe(0);
      expect(results[1].data.length).toBe(0);
    });
  });
}); 