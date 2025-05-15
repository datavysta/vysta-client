import { VystaClient } from '../../src/VystaClient';
import { ProductService } from './services';
import { QueryParams } from '../../src/types';
import { Product } from './types';

async function example() {
  // Initialize client
  const client = new VystaClient({
    baseUrl: 'http://localhost:8080',
    debug: true,
  });

  try {
    // Login
    await client.login('test@datavysta.com', 'password');

    // Initialize services
    const products = new ProductService(client);

    // Basic queries
    const allProducts = await products.getAll();
    console.log('All products:', allProducts.data.length, 'Total:', allProducts.count);

    // Get single record by ID
    const product = await products.getById(1);
    console.log('Single product:', product.productName);

    // Query with filters, sorting, and pagination
    const params: QueryParams<Product> = {
      filters: {
        unitPrice: { gt: 20 },
        discontinued: { eq: 0 },
      },
      order: {
        unitPrice: 'desc',
      },
      limit: 10,
      offset: 0,
    };
    const expensiveProducts = await products.getAll(params);
    console.log(
      'Expensive active products:',
      expensiveProducts.data.length,
      'Total:',
      expensiveProducts.count,
    );

    // Create new record
    const newProduct = await products.create({
      productId: 78,
      productName: 'New Product',
      unitPrice: 29.99,
      unitsInStock: 100,
      discontinued: false,
    });
    console.log('Created product:', newProduct.productId);

    // Update single record
    const updateCount = await products.update(newProduct.productId, {
      unitPrice: 34.99,
    });
    console.log('Updated product price, affected rows:', updateCount);

    // Bulk update with filter
    const bulkUpdateCount = await products.updateWhere(
      { filters: { discontinued: { eq: 0 } } },
      { unitsInStock: 0 },
    );
    console.log('Marked products as out of stock, affected rows:', bulkUpdateCount);

    // Delete single record
    const deleteCount = await products.delete(newProduct.productId);
    console.log('Deleted product, affected rows:', deleteCount);

    // Bulk delete with filter
    const bulkDeleteCount = await products.deleteWhere({
      filters: {
        discontinued: { eq: 1 },
        unitsInStock: { eq: 0 },
      },
    });
    console.log('Deleted discontinued products with no stock, affected rows:', bulkDeleteCount);

    // Pattern matching with LIKE
    const searchResults = await products.getAll({
      filters: {
        productName: { like: '%Chai%' },
      },
    });
    console.log(
      'Products containing "Chai":',
      searchResults.data.length,
      'Total:',
      searchResults.count,
    );

    // Multiple filters with sorting
    const complexQuery = await products.getAll({
      select: ['productId', 'productName', 'unitPrice'],
      filters: {
        categoryId: { in: [1, 2, 3] },
        unitPrice: { gt: 10 },
      },
      order: {
        unitPrice: 'asc',
      },
      limit: 5,
    });
    console.log('Complex query results:', complexQuery.data.length, 'Total:', complexQuery.count);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.logout();
  }
}

// Run the example
example();
