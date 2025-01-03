# Vysta Client

A strongly-typed TypeScript client for Vysta APIs.

## Installation

```bash
npm install @datavysta/vysta-client
```

## Usage

### Basic Setup

```typescript
import { VystaClient } from '@datavysta/vysta-client';

// Initialize the client
const client = new VystaClient({
  baseUrl: 'https://api.datavysta.com',
  debug: true
});

// Login
await client.login('username', 'password');
```

### Token Storage

By default, tokens are stored in sessionStorage. You can customize this behavior:

```typescript
import { TokenStorage, TokenKey } from '@datavysta/vysta-client';

// Custom token storage using localStorage
const myStorage: TokenStorage = {
  setToken(key: TokenKey, value: string) {
    localStorage.setItem(key, value);
  },
  getToken(key: TokenKey) {
    return localStorage.getItem(key);
  },
  clearTokens() {
    localStorage.clear();
  }
};

// Custom error handling
const myErrorHandler = {
  onError(error: Error) {
    console.error('Auth error:', error);
    // Redirect to login page, show notification, etc.
  }
};

// Initialize client with custom storage
const client = new VystaClient({
  baseUrl: 'https://api.datavysta.com',
  storage: myStorage,
  errorHandler: myErrorHandler
});
```

### Creating a Service

```typescript
// Define your entity type
interface Product {
  productId: number;
  productName: string;
  unitPrice: number;
  unitsInStock: number;
  discontinued: number;
}

// Create a service class for your entity
export class ProductService extends VystaService<Product> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Products', {
      primaryKey: 'productId'
    });
  }
}

// Initialize the service
const products = new ProductService(client);
```

### Query Operations

```typescript
// Get all products
const result = await products.getAll();
console.log('Products:', result.data);
console.log('Total count:', result.count);

// Query with filters and pagination
const filtered = await products.getAll({
  filters: {
    unitPrice: { gt: 20 },
    discontinued: { eq: 0 },
    category: { eq: 'Beverages' }
  },
  order: {
    unitPrice: 'desc'
  },
  limit: 10,
  offset: 0,
  recordCount: true  // Include total record count
});
```

### Query Parameters

The following query parameters are supported:

- `limit`: Maximum number of records to return
- `offset`: Number of records to skip
- `order`: Object specifying field and direction ('asc' or 'desc')
- `filter`: Filter expression
- `recordCount`: Set to true to include total record count in response header

Example:
```typescript
const params = {
  limit: 10,
  offset: 0,
  order: {
    productId: 'desc'
  },
  filter: 'category eq "Beverages"',
  recordCount: true  // Optional: Include total record count
};

const result = await service.getAll(params);
```

### Response

The response will include:
- The requested records as an array
- The total number of records matching the query (when `recordCount: true` is specified)

### Response Types

The `getAll()` method returns a `DataResult<T>` object:
```typescript
interface DataResult<T> {
  data: T[];        // Array of records
  count: number;    // Total record count (-1 if not available)
  error: Error | null;
}
```

The `count` field will be:
- The total number of records matching the query when `recordCount: true`
- `-1` when the count is not available
- Useful for pagination and infinite scroll implementations

See the [examples](examples/) directory for more detailed usage examples.

### CRUD Operations

```typescript
// Create
const newProduct = await products.create({
  productId: 78,
  productName: 'New Product',
  unitPrice: 29.99,
  unitsInStock: 100,
  discontinued: 0
});

// Update
await products.update(78, {
  unitPrice: 39.99,
  unitsInStock: 50
});

// Delete
await products.delete(78);

// Bulk operations
await products.updateWhere(
  { filters: { discontinued: { eq: 0 } } },
  { unitsInStock: 0 }
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
