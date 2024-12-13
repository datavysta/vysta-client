import { ProductService } from '../examples/querying/services';
import { Product } from '../examples/querying/types';
import { createTestClient, authenticateClient } from './setup';

describe('CRUD Operations', () => {
  const client = createTestClient();
  let products: ProductService;
  let testProduct: Product;

  beforeAll(async () => {
    await authenticateClient(client);
    products = new ProductService(client);
  });

  afterAll(async () => {
    // Cleanup product 78 if it exists
    try {
      await products.delete(78);
    } catch (e) {
      // Ignore if product doesn't exist
    }
  });

  describe('Create', () => {
    it('should create a new product with ID 78', async () => {
      // First verify product doesn't exist
      const initialCheck = await products.getAll({
        filters: { product_id: { eq: 78 } }
      });
      expect(initialCheck.length).toBe(0);

      // Create the product
      const newProduct = {
        product_id: 78,
        product_name: 'Test Product',
        unit_price: 29.99,
        units_in_stock: 100,
        discontinued: 0
      };

      await products.create(newProduct);

      // Verify product was created and store for later tests
      const createdProduct = await products.getById(78);
      expect(createdProduct.product_id).toBe(78);
      expect(createdProduct.product_name).toBe(newProduct.product_name);
      testProduct = createdProduct;
    });
  });

  describe('Read', () => {
    it('should get product by id', async () => {
      const product = await products.getById(testProduct.product_id);
      expect(product.product_name).toBe('Test Product');
    });

    it('should get all products', async () => {
      const allProducts = await products.getAll();
      expect(Array.isArray(allProducts)).toBe(true);
      expect(allProducts.length).toBeGreaterThan(0);
    });
  });

  describe('Update', () => {
    it('should update a product', async () => {
      const updates = {
        product_name: 'Updated Test Product',
        unit_price: 39.99
      };

      const affected = await products.update(testProduct.product_id, updates);
      expect(affected).toBe(1);

      const updated = await products.getById(testProduct.product_id);
      expect(updated.product_name).toBe(updates.product_name);
      expect(updated.unit_price).toBe(updates.unit_price);
    });

    it('should update multiple products', async () => {
      const affected = await products.updateWhere(
        { filters: { discontinued: { eq: 0 } } },
        { units_in_stock: 0 }
      );
      expect(affected).toBeGreaterThan(0);

      const result = await products.getAll({
        filters: {
          discontinued: { eq: 0 },
          units_in_stock: { eq: 0 }
        }
      });

      expect(result.length).toBe(affected);
      result.forEach(product => {
        expect(product.units_in_stock).toBe(0);
      });
    });
  });

  describe('Delete', () => {
    it('should delete a product', async () => {
      const affected = await products.delete(testProduct.product_id);
      expect(affected).toBe(1);
      
      const result = await products.getAll({
        filters: {
          product_id: { eq: testProduct.product_id }
        }
      });
      
      expect(result.length).toBe(0);
    });

    it('should delete multiple products', async () => {
      // Create test products
      const testProducts = await Promise.all([
        products.create({ product_id: 200, product_name: 'Test 1', unit_price: 1234.56, discontinued: 1 }),
        products.create({ product_id: 201, product_name: 'Test 2', unit_price: 1234.56, discontinued: 1 })
      ]);

      // Delete all discontinued products
      const affected = await products.deleteWhere({
        filters: {
          unit_price: { eq: 1234.56 }
        }
      });
      expect(affected).toBe(2);

      // Verify deletion of both products
      const results = await Promise.all([
        products.getAll({
          filters: { product_id: { eq: 200 } }
        }),
        products.getAll({
          filters: { product_id: { eq: 201 } }
        })
      ]);

      expect(results[0].length).toBe(0);
      expect(results[1].length).toBe(0);
    });
  });
}); 