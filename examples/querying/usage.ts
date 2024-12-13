import { VystaClient } from '../../src/VystaClient';
import { ProductService, CustomerService } from './services';
import { QueryParams } from '../../src/types';
import { Product } from './types';

async function example() {
  // Initialize client
  const client = new VystaClient({ 
    baseUrl: 'http://localhost:8080',
    debug: true
  });

  try {
    // Login
    await client.login('test@datavysta.com', 'password');

    // Initialize services
    const products = new ProductService(client);
    const customers = new CustomerService(client);

    // Basic queries
    const allProducts = await products.getAll();
    console.log('All products:', allProducts.length);

    // Get single record by ID
    const product = await products.getById(1);
    console.log('Single product:', product.product_name);

    // Query with filters, sorting, and pagination
    const params: QueryParams<Product> = {
      filters: {
        unit_price: { gt: 20 },
        discontinued: { eq: 0 }
      },
      order: {
        unit_price: 'desc'
      },
      limit: 10,
      offset: 0
    };
    const expensiveProducts = await products.getAll(params);
    console.log('Expensive active products:', expensiveProducts.length);

    // Create new record
    const newProduct = await products.create({
      product_id: 78,
      product_name: 'New Product',
      unit_price: 29.99,
      units_in_stock: 100,
      discontinued: 0
    });
    console.log('Created product:', newProduct.product_id);

    // Update single record
    const updateCount = await products.update(newProduct.product_id, {
      unit_price: 34.99
    });
    console.log('Updated product price, affected rows:', updateCount);

    // Bulk update with filter
    const bulkUpdateCount = await products.updateWhere(
      { filters: { discontinued: { eq: 0 } } },
      { units_in_stock: 0 }
    );
    console.log('Marked products as out of stock, affected rows:', bulkUpdateCount);

    // Delete single record
    const deleteCount = await products.delete(newProduct.product_id);
    console.log('Deleted product, affected rows:', deleteCount);

    // Bulk delete with filter
    const bulkDeleteCount = await products.deleteWhere({
      filters: {
        discontinued: { eq: 1 },
        units_in_stock: { eq: 0 }
      }
    });
    console.log('Deleted discontinued products with no stock, affected rows:', bulkDeleteCount);

    // Pattern matching with LIKE
    const searchResults = await products.getAll({
      filters: {
        product_name: { like: '%Chai%' }
      }
    });
    console.log('Products containing "Chai":', searchResults.length);

    // Multiple filters with sorting
    const complexQuery = await products.getAll({
      select: ['product_id', 'product_name', 'unit_price'],
      filters: {
        category_id: { in: [1, 2, 3] },
        unit_price: { gt: 10 }
      },
      order: {
        unit_price: 'asc'
      },
      limit: 5
    });
    console.log('Complex query results:', complexQuery.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.logout();
  }
}

// Run the example
example(); 