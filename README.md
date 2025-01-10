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

The library provides two base service classes:

#### VystaReadonlyService
For read-only data sources that don't support CRUD operations, such as views, aggregations, or reports:

```typescript
// Define your entity type
interface CustomerSummary {
  customerId?: string;
  count?: number;
  companyName?: string;
}

// Create a read-only service for a view/aggregation
export class CustomerSummaryService extends VystaReadonlyService<CustomerSummary> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'CustomerSummary');
  }
}

// Use the service for querying
const summaries = new CustomerSummaryService(client);
const result = await summaries.getAll({
  filters: {
    count: { gt: 0 }
  },
  order: {
    companyName: 'asc'
  }
});
```

#### VystaService
For full CRUD operations on entities with primary keys:

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

// Use CRUD operations
const product = await products.getById(1);
console.log(`Product: ${product.productName}`);

// Query active products
const activeProducts = await products.getAll({
  filters: {
    discontinued: { eq: 0 }
  },
  order: {
    unitPrice: 'desc'
  }
});

// Update price and stock levels
await products.update(1, { unitPrice: 29.99 });
await products.delete(1);
```

### Query Operations

Both service types support the same querying capabilities:

```typescript
// Basic query
const result = await summaries.getAll();
console.log('Summaries:', result.data);
console.log('Total count:', result.count);

// Simple filter
const activeProducts = await products.getAll({
  filters: {
    discontinued: { eq: 0 }
  }
});

// Complex query with multiple filters, sorting, and pagination
const customerReport = await summaries.getAll({
  // Select specific fields
  select: ['customerId', 'companyName', 'count'],
  
  // Multiple filters
  filters: {
    count: { gt: 5 },
    companyName: { like: '%Ltd%' }
  },
  
  // Sort by multiple fields
  order: {
    count: 'desc',
    companyName: 'asc'
  },
  
  // Pagination
  limit: 10,
  offset: 0,
  
  // Include total record count
  recordCount: true
});

// Response includes data and total count
console.log('Matching customers:', customerReport.data.length);
console.log('Total matches:', customerReport.count);
```

### Hydration

Services support hydration to add computed properties to each row by overriding the `hydrate` method:

```typescript
// Basic example with customer names
interface Customer {
  firstName: string;
  lastName: string;
}

interface CustomerWithFullName extends Customer {
  fullName: string;
}

class CustomerService extends VystaReadonlyService<Customer, CustomerWithFullName> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Customers');
  }

  protected override hydrate(customer: Customer): CustomerWithFullName {
    return {
      ...customer,
      fullName: `${customer.firstName} ${customer.lastName}`
    };
  }
}

// Advanced example with calculated values
interface Product {
  productId: number;
  productName: string;
  unitPrice: number;
  unitsInStock: number;
  discontinued: number;
}

interface ProductWithValue extends Product {
  totalStockValue: number;
}

class ProductService extends VystaService<Product, ProductWithValue> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Products', {
      primaryKey: 'productId'
    });
  }

  protected override hydrate(product: Product): ProductWithValue {
    return {
      ...product,
      totalStockValue: product.unitPrice * product.unitsInStock
    };
  }
}

// Use hydrated values in queries
const products = new ProductService(client);
const expensiveStock = await products.getAll({
  filters: {
    totalStockValue: { gt: 1000 },
    discontinued: { eq: 0 }
  },
  order: {
    totalStockValue: 'desc'
  }
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
