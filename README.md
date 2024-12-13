# Vysta Client

A strongly-typed TypeScript client for Vysta APIs.

## Installation

```bash
npm install @datavysta/vysta-client
```

## Usage

### Basic Setup

```typescript
import { VystaClient, VystaService } from '@datavysta/vysta-client';
import type { QueryParams } from '@datavysta/vysta-client';

// Initialize the client
const client = new VystaClient({
  baseUrl: 'https://api.datavysta.com',
  debug: true
});

// Login
await client.login('username', 'password');
```

### Creating a Service

```typescript
// Define your entity type
interface Product {
  product_id: number;
  product_name: string;
  unit_price: number;
  units_in_stock: number;
  discontinued: number;
}

// Create a service class for your entity
export class ProductService extends VystaService<Product> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'products', {
      primaryKey: 'product_id'
    });
  }
}

// Initialize the service
const products = new ProductService(client);
```

### Query Operations

```typescript
// Get all products
const allProducts = await products.getAll();

// Get with filters
const activeProducts = await products.getAll({
  filters: {
    discontinued: { eq: 0 },
    unit_price: { gt: 20 }
  },
  limit: 10,
  offset: 0,
  order: {
    unit_price: 'desc'
  }
});

// Get by ID
const product = await products.getById(1);
```

### CRUD Operations

```typescript
// Create
const newProduct = await products.create({
  product_id: 78,
  product_name: 'New Product',
  unit_price: 29.99,
  units_in_stock: 100,
  discontinued: 0
});

// Update
await products.update(78, {
  unit_price: 39.99,
  units_in_stock: 50
});

// Delete
await products.delete(78);

// Bulk operations
await products.updateWhere(
  { filters: { discontinued: { eq: 0 } } },
  { units_in_stock: 0 }
);

await products.deleteWhere({
  filters: { discontinued: { eq: 1 } }
});
```

## Query Operators

The following operators are supported for filtering:

- `eq` - Equal
- `neq` - Not Equal
- `gt` - Greater Than
- `gte` - Greater Than or Equal
- `lt` - Less Than
- `lte` - Less Than or Equal
- `like` - Pattern Matching
- `nlike` - Negative Pattern Match
- `in` - In Array
- `nin` - Not In Array
- `isnull` - Is NULL
- `isnotnull` - Is Not NULL

## License

MIT
