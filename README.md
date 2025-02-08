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
  discontinued: boolean;
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
    discontinued: { eq: false }
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
    discontinued: { eq: false }
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

### **Download Operations**

The `download` method allows you to download data in CSV or Excel formats based on query parameters.

```typescript
// Download CSV file
const csvBlob = await summaries.download({
  filters: {
    discontinued: { eq: false }
  }
}, FileType.CSV);

// Download Excel file
const excelBlob = await summaries.download({
  filters: {
    discontinued: { eq: false }
  }
}, FileType.EXCEL);
```

### Hydration

Services support hydration to add computed properties to each row by overriding the `hydrate` method:

> **Note:** Vysta recommends prefixing calculated fields with an underscore (_) to distinguish them from persisted fields. This helps exclude them from various operations like updates and filtering.

```typescript
// Basic example with customer names
interface Customer {
  firstName: string;
  lastName: string;
}

interface CustomerWithFullName extends Customer {
  _fullName: string;  // Calculated field prefixed with _
}

class CustomerService extends VystaReadonlyService<Customer, CustomerWithFullName> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Customers');
  }

  protected override hydrate(customer: Customer): CustomerWithFullName {
    return {
      ...customer,
      _fullName: `${customer.firstName} ${customer.lastName}`
    };
  }
}

// Advanced example with calculated values
interface Product {
  productId: number;
  productName: string;
  unitPrice: number;
  unitsInStock: number;
  discontinued: boolean;
}

interface ProductWithValue extends Product {
  _totalStockValue: number;  // Calculated field prefixed with _
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
      _totalStockValue: product.unitPrice * product.unitsInStock
    };
  }
}

// Use hydrated values in queries
const products = new ProductService(client);
const expensiveStock = await products.getAll({
  filters: {
    _totalStockValue: { gt: 1000 },
    discontinued: { eq: false }
  },
  order: {
    _totalStockValue: 'desc'
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
- `q`: Optional search term for full-text search across relevant fields
- `select`: Specifies which fields to include in the response. Can be used in multiple ways:
    - As an array: `select=id,name`
    - As an object mapping field names to custom labels: `select=id=no,name=label`
    - You can mix and match both formats: `select=id,name=label`
    - The order in which fields appear in `select` determines their order in the response.

Example:
```typescript
const params = {
  limit: 10,
  offset: 0,
  order: {
    productId: 'desc'
  },
  filter: 'category eq "Beverages"',
  recordCount: true,  // Optional: Include total record count
  q: 'chai'  // Optional: Search for products containing 'chai'
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
  discontinued: false
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
  { filters: { discontinued: { eq: false } } },
  { unitsInStock: 0 }
);

await products.deleteWhere({
  filters: { discontinued: { eq: true } }
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

## Authentication

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `login` | Authenticates with username/password | `username: string`<br>`password: string` | `Promise<AuthResult>` |
| `logout` | Logs out and clears auth data | none | `void` |
| `getSignInMethods` | Gets available OAuth providers | none | `Promise<SignInInfo[]>` |
| `getAuthorizeUrl` | Gets OAuth authorization URL | `signInId: string` | `Promise<string>` |
| `exchangeToken` | Exchanges OAuth token for auth result | `token: string` | `Promise<AuthResult>` |
| `getUserProfile` | Gets authenticated user's profile | none | `Promise<UserProfile>` |

### Types

```typescript
interface UserProfile {
  name: string;
  email: string | null;
  emailVerifiedOn: string | null;
  phoneNumber: string | null;
  phoneNumberVerifiedOn: string | null;
  apiKeyCreatedOn: string | null;
}

interface SignInInfo {
  id: string;    // Provider ID (e.g., 'okta')
  name: string;  // Display name (e.g., 'Okta')
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  host: string;
}
```

### Example Usage

```typescript
// Password authentication
const result = await client.login('user@example.com', 'password');

// OAuth authentication
const providers = await client.getSignInMethods();
const authUrl = await client.getAuthorizeUrl(providers[0].id);
// Redirect user to authUrl
window.location.href = authUrl;

// Handle OAuth redirect
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('Token');  // Token parameter name may vary by provider
const redirectUrl = urlParams.get('RedirectUrl');  // Original redirect URL from provider
const authResult = await client.exchangeToken(token);

// After successful authentication, redirect to the provided URL or your default
if (redirectUrl) {
  window.location.replace(redirectUrl);
}
```

> Note: Your application is responsible for handling the OAuth redirect. The provider will return both a token and a redirect URL. 
> For Okta, the redirect will typically be to `/authenticationRedirect` on your application's domain. After exchanging the token, 
> you should redirect the user to the provided URL or your application's default location. Both OAuth and password authentication 
> result in the same authenticated state, allowing you to make API calls with the client.

## License

MIT
