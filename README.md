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

**Multi-tenant / custom host header**

If your Vysta deployment differentiates tenants by the incoming host name you can forward that value with every request (including authentication) via the optional `host` setting:

```typescript
const client = new VystaClient({
  baseUrl: 'https://api.datavysta.com',
  host: 'my-tenant.example.com'   // sent as X-DataVysta-Host on every call
});

// You can also change it later:
client.setHost('other-tenant.example.com');
```

The library automatically adds an `X-DataVysta-Host` header to all requests whenever `host` is set.

If your frontend is already served from the tenant-specific domain (e.g. `https://my-tenant.example.com`) you don't need to set `host` at all—the backend will automatically use the request's `Origin`/`Host` header to resolve the tenant.

### Token Storage

By default, tokens are stored in localStorage. You can customize this behavior:

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

### Caching

The Vysta client ships with a lightweight, **range-aware cache** (similar in spirit to React-Query) that can dramatically cut round-trips when you scroll, paginate or repeatedly query the same data.

• Default storage is **IndexedDB** in the browser (via the [`idb`](https://github.com/jakearchibald/idb) helper) and an in-memory `Map` in Node.js.  
• Caching is **opt-in at the GET query level** – you can configure it per client or swap in your own `CacheStorage` implementation.

```typescript
import { VystaClient, DefaultCacheStorage } from '@datavysta/vysta-client';

// 1) Use default cache with default config (TTL = 5 min, maxSize = 1000 entries)
const client = new VystaClient({
  baseUrl: 'https://api.datavysta.com'
});

// 2) Fine-tune TTL / size
const client = new VystaClient({
  baseUrl: '…',
  cache: {
    ttl: 10 * 60 * 1000,   // 10 minutes
    maxSize: 500           // keep newest 500 entries (LRU)
  }
});

// 3) Provide a completely custom cache backend
class RedisCache implements CacheStorage { /* … */ }
const client = new VystaClient({
  baseUrl: '…',
  cache: new RedisCache()
});
```

#### Per-request cache control
```typescript
// Enable cache for specific requests (cache is opt-in)
await service.getAll({ limit: 10, useCache: true });
await service.query({ conditions: [...], useCache: true });
await service.getById(123, true); // second parameter enables cache

// Disable cache for specific requests
await service.getAll({ limit: 10, useCache: false });
await service.query({ conditions: [...], useCache: false });
await service.getById(123, false); // second parameter disables cache

// Default behavior (no cache specified)
await service.getAll({ limit: 10 }); // no cache used
await service.getById(123); // no cache used
```

#### Manual cache control
```typescript
await client.clearCache();                              // everything
await client.clearCacheForEntity('Northwinds', 'Products');

const products = new ProductService(client);
await products.refreshCache();                          // this service only
```

#### How range-aware caching works
1. **One entry per logical query** – the cache key uses connection + entity + method (`getAll`, `query`, …) + _filters/sort_.  
   Pagination values (`offset`, `limit`) are _excluded_, so all pages merge into the same entry.
2. Each entry stores: `records[]`, `loadedRanges[]` and `totalCount`.  
3. When you fetch e.g. rows `40-60`, the cache either:
   • slices and returns instantly if that range is already covered, or  
   • fetches only the missing rows, merges them into the entry, and updates the range list.
4. Subsequent requests for any previously-loaded window are served in-memory (≈1-2 ms).

This strategy means that after a single linear scroll through an infinite-scroll grid, **no further network calls are made** for that dataset until the TTL expires or you invalidate the cache.

> **Note**: If you bundle for browsers you'll need `idb` as a dependency, which is already declared in `peerDependencies`. Simply `npm install` in your project and most bundlers will include it automatically.

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

### Content Type Handling

The client automatically handles different response types based on the Content-Type header:

- `application/json`: Responses are parsed as JSON
- `text/plain` and other text formats: Responses are returned as string
- Other formats: Responses are returned as Blob

This allows the same API methods to work with different response formats, making it more flexible when dealing with APIs that might return different types of data.

Explore live demonstrations in our [Examples Hub](examples/index.html), showcasing various client features.

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

### File Upload Service

The `VystaFileService` provides file upload capabilities using TUS protocol:

```typescript
import { VystaClient, VystaFileService } from '@datavysta/vysta-client';
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';

// Create a file service
export class NorthwindFileService extends VystaFileService {
  constructor(client: VystaClient) {
    super(client, 'NorthwindFile');
  }
}

// Initialize the service
const northwindFileService = new NorthwindFileService(client);

// Create an Uppy instance for file upload
const uppy = new Uppy()
  .use(Tus, {
    ...(await northwindFileService.getTusXhrOptions())
  });

// Handle file upload
uppy.on('upload-success', async (file, response) => {
  // Register the uploaded file with Vysta
  await northwindFileService.registerUploadedFile({
    path: '/',
    id: file.id,
    name: file.name
  });
});

// Add files and start upload
uppy.addFile({
  name: 'product-image.jpg',
  type: 'image/jpeg',
  data: new Blob(['file contents'])
});
uppy.upload();
```

## Admin Services

### User Administration

The `VystaAdminUserService` provides methods for managing users, including creating, listing, updating, deleting users, as well as managing invitations and password resets.

```typescript
import { VystaClient, VystaAdminUserService } from '@datavysta/vysta-client';

const client = new VystaClient({ baseUrl: 'http://localhost:8080' });
const userService = new VystaAdminUserService(client);

// List users
const users = await userService.listUsers();

// Get available roles
const roleService = new VystaRoleService(client);
const roles = await roleService.getAllRoles();
const userRoleId = roles.find(r => r.name === 'User')?.id;
const adminRoleId = roles.find(r => r.name === 'Admin')?.id;

// Create a new user
const newUser = await userService.createUser({
  name: 'John Smith',
  email: 'john.smith@example.com',
  roleIds: [userRoleId], // UUID from the roles list
  forceChange: true
});

// Create a user with custom redirect URL for invitation emails
const newUserWithRedirect = await userService.createUser({
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  roleIds: [userRoleId],
  forceChange: true,
  invitationRedirectUrl: '/custom/onboarding' // Custom path for invitation acceptance
});

// Update a user
await userService.updateUser(userId, {
  name: 'Jane Doe',
  email: 'jane@example.com',
  roleIds: [adminRoleId] // UUID from the roles list
});

// User management operations
await userService.resendInvitation(userId);  // Resend invitation email
await userService.sendInvitation(userId);     // Send a new invitation
await userService.forgotPassword(userId);     // Send password reset link
const inviteLink = await userService.copyInvitation(userId);  // Get invitation link to copy/share
await userService.revokeByUserId(userId);     // Delete/revoke a user
```

#### User Type
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  // The API returns roleIds and roleNames as comma-delimited strings
  roleIds: string;
  roleNames: string;
  // Array versions of the roles
  roleIdsArray: string[];
  roleNamesArray: string[];
  invitationId?: string;
  forceChange: boolean;
  disabled: boolean;
  createdOn: string;
  modifiedOn: string;
  properties?: string;
  password?: string; // Only used when creating/updating users
}

// For creating users, use this structure
interface CreateUserData {
  name?: string;
  email?: string;
  roleIds?: string[]; // Array of role UUIDs
  phoneNumber?: string;
  forceChange?: boolean;
  properties?: string;
  password?: string;
  invitationRedirectUrl?: string; // Optional custom redirect URL for invitation emails
}
```

### Role Management

The `VystaRoleService` allows you to fetch all roles defined in the system.

```typescript
import { VystaClient, VystaRoleService, Role } from '@datavysta/vysta-client';

const client = new VystaClient({ baseUrl: 'http://localhost:8080' });
const roleService = new VystaRoleService(client);

const roles: Role[] = await roleService.getAllRoles();
roles.forEach(role => {
  // Role IDs are UUIDs
  console.log(role.id, role.name, role.description);
});
```

#### Role Type
```typescript
export interface Role {
  id: string; // UUID
  name: string;
  description?: string;
}
```

### Permissions

The `VystaPermissionService` provides methods to fetch permissions for connections, tables, views, queries, procedures, workflows, and filesystems.

```typescript
import { VystaClient, VystaPermissionService, ObjectPermission } from '@datavysta/vysta-client';

const client = new VystaClient({ baseUrl: 'http://localhost:8080' });
const permissionService = new VystaPermissionService(client);

// Get permissions for a connection
const perms: ObjectPermission = await permissionService.getConnectionPermissions('Northwinds');

// Get permissions for a table
const tablePerms: ObjectPermission = await permissionService.getTablePermissions('Northwinds', 'region');

// Check if the user can select from a connection
const canSelect = await permissionService.canSelectConnection('Northwinds');
if (canSelect) {
  // User can select from this connection
  console.log('User CAN select from Northwinds');
} else {
  console.log('User CANNOT select from Northwinds');
}
```

#### ObjectPermission Type
```typescript
export interface ObjectPermission {
  id: string;
  children: ObjectPermission[];
  where: any;
  grants: string[];
}
```

### Timezone Service

The `VystaTimezoneService` lets you retrieve the list of supported time-zones for your UI or settings pages.

```typescript
const timezones = await new VystaTimezoneService(client).getAllTimezones();
// → [{ id: 'Europe/Paris', displayName: 'Paris (Europe)' }, …]
```

Authentication is required; otherwise the call throws "Not authenticated".

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

## Environment and Tenant Switching

The Vysta client supports seamless switching between different environments and tenants while maintaining authentication state. This allows users to work across multiple tenants and environments (dev, staging, production) without needing to re-authenticate.

Users can switch:
- **Between environments within the same tenant** (e.g., from Production to Staging within TenantA)
- **Between different tenants and their environments** (e.g., from TenantA-Production to TenantB-Development)
- **To any environment they have access to**, regardless of tenant boundaries

### Environment and Tenant Switching Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getAvailableEnvironments` | Gets list of available environments for the user | none | `Promise<EnvironmentAvailable[]>` |
| `switchEnvironment` | Initiates a switch to a different environment | `tenantId: string`<br>`environmentId: string` | `Promise<string>` (exchange token) |
| `constructAuthenticationRedirectUrl` | Builds redirect URL for environment switching | `exchangeToken: string`<br>`targetHost: string`<br>`redirectUrl?: string` | `string` |
| `getCurrentEnvironmentInfo` | Gets current tenant and environment information | none | `{ tenantId: string; envId: string } \| null` |

### Environment Types

```typescript
interface EnvironmentAvailable {
  environmentId: string;
  environmentName: string;
  host: string;
  tenantId: string;
  tenantName: string;
}

interface CreateEnvironmentResponse {
  authExchangeToken: string;
  tenantId: string;
  envId: string;
  host: string;
}
```

### Environment and Tenant Switching Workflow

The complete environment and tenant switching process involves these steps:

1. **Get Available Environments** - Fetch all environments across all tenants the user has access to
2. **Initiate Environment/Tenant Switch** - Get an exchange token for the target tenant and environment
3. **Exchange Token** - Exchange the token for new authentication credentials in the target tenant/environment
4. **Update Client Host** - Update the client's host to point to the new environment

```typescript
// 1. Get available environments across all accessible tenants
const environments = await client.getAvailableEnvironments();
console.log('Available environments:', environments);

// Environments are grouped by tenant - you can switch to any combination
// Example: environments might include:
// - TenantA: Production, Staging, Development
// - TenantB: Production, Testing
// - TenantC: Production

// 2. Switch to a specific tenant and environment
const targetEnvironment = environments.find(env => 
  env.tenantName === 'TenantB' && env.environmentName === 'Production'
);

const exchangeToken = await client.switchEnvironment(
  targetEnvironment.tenantId,    // Switch to different tenant
  targetEnvironment.environmentId // Switch to specific environment within that tenant
);

// 3. Exchange token for new authentication in target tenant/environment
const newAuthResult = await client.exchangeToken(exchangeToken);

// 4. Update client host to target environment
client.setHost(targetEnvironment.host);

// 5. Get current tenant and environment info
const currentEnv = client.getCurrentEnvironmentInfo();
console.log('Current tenant:', currentEnv.tenantId);
console.log('Current environment:', currentEnv.envId);
```

### URL-Based Environment and Tenant Switching

For applications that need to redirect to different hosts (potentially different tenant domains):

```typescript
// Construct redirect URL for environment/tenant switching
const redirectUrl = client.constructAuthenticationRedirectUrl(
  exchangeToken,
  targetEnvironment.host,    // Could be a completely different domain for different tenant
  '/my-app/dashboard'        // Optional: where to redirect after switch
);

// Redirect to target tenant/environment
window.location.href = redirectUrl;
```

### Error Handling

Environment and tenant switching can fail for several reasons:

```typescript
try {
  const exchangeToken = await client.switchEnvironment(tenantId, environmentId);
  // ... continue with token exchange
} catch (error) {
  if (error.message.includes('Access denied')) {
    console.log('User does not have access to target tenant/environment');
  } else if (error.message.includes('Environment switch failed')) {
    console.log('Environment/tenant switch request failed');
  } else {
    console.log('Unexpected error:', error.message);
  }
}
```

### Security Considerations

- **Exchange tokens are short-lived and single-use** - Use them immediately after receiving
- **Original access tokens are never sent to different tenants/environments** - Each tenant/environment gets its own isolated tokens
- **All API calls require proper authorization headers** - The client handles this automatically
- **Token refresh logic handles expiration during tenant/environment switches** - Automatic token management
- **Tenant isolation is maintained** - Switching between tenants maintains proper security boundaries

> **Example**: See the [Environment Switching Demo](examples/auth/environment-switching.html) for a complete working implementation with multi-tenant environment switching, UI, and debug information.

## License

MIT

### Workflow Services

For executing workflows, extend the `VystaWorkflowService` base class:

```typescript
import { VystaClient, VystaWorkflowService } from '@datavysta/vysta-client';

// Define workflow input types
export interface InputTestInput {
    test: string;
}

// Create a workflow service
export class WorkflowService extends VystaWorkflowService {
    constructor(client: VystaClient) {
        super(client);
    }

    async inputTest(input: InputTestInput): Promise<void> {
        return this.executeWorkflow<InputTestInput, void>('InputTest', input);
    }

    async plainWait(): Promise<void> {
        return this.executeWorkflow('PlainWait');
    }
}

// Use the workflow service
const workflows = new WorkflowService(client);

// Execute workflow with input
await workflows.inputTest({ test: 'example' });

// Execute workflow without input
await workflows.plainWait();

// Execute workflow asynchronously and get a Job ID
const jobId = await workflows.inputTestAsync({ test: 'example async' });
console.log('Workflow started asynchronously with Job ID:', jobId);
```

### Job Service

For retrieving the status and details of jobs, especially those initiated by asynchronous workflows, use the `VystaAdminJobService`.

```typescript
import { VystaClient, VystaAdminJobService, JobStatus, JobSummary, WorkflowService } from '@datavysta/vysta-client';

// Assume client is already initialized and logged in
// const client = new VystaClient(...);
// await client.login(...);

const workflowService = new WorkflowService(client);
const jobService = new VystaAdminJobService(client);

async function monitorJob() {
  try {
    // 1. Start an asynchronous workflow
    const jobId = await workflowService.inputTestAsync({ test: 'monitoring_example' });
    console.log('Workflow started, Job ID:', jobId);

    // 2. Get the job summary
    const jobSummary: JobSummary = await jobService.getJobSummary(jobId);
    console.log('Job Status:', jobSummary.status);
    console.log('Job Details:', jobSummary);

    // You can poll the job status until it reaches a terminal state
    if (jobSummary.status === JobStatus.SUCCEEDED) {
      console.log('Job succeeded!', jobSummary.message);
    } else if (jobSummary.status === JobStatus.FAILED) {
      console.error('Job failed:', jobSummary.errormessage);
    }
    // Add further polling logic if needed

  } catch (error) {
    console.error('Error monitoring job:', error);
  }
}

monitorJob();
```

The `JobSummary` interface provides detailed information about the job, and `JobStatus` is an enum representing the various states a job can be in.

### Aggregate Queries and Type-Safe Select

You can use aggregate functions and aliases in your select queries. For type safety, use the exported `SelectColumn<T>` type and `Aggregate` enum:

```typescript
import { Aggregate, SelectColumn } from '@datavysta/vysta-client';

const select: SelectColumn<Product>[] = [
  { name: 'unitPrice', aggregate: Aggregate.AVG, alias: 'avgUnitPrice' },
  { name: 'unitsInStock', aggregate: Aggregate.SUM, alias: 'totalUnitsInStock' },
  { name: 'productId' },
];

const result = await products.query({ select });
console.log(result.data[0].avgUnitPrice, result.data[0].totalUnitsInStock);
```

You can also use the string[] format for select, but this is less type-safe:

```typescript
const result = await products.query({
  select: [
    'AVG(unitPrice)=avgUnitPrice',
    'SUM(unitsInStock)=totalUnitsInStock',
    'productId',
  ]
});
```

- `Aggregate` and `SelectColumn` are exported from the package for ergonomic, type-safe aggregate queries.
- For GET endpoints, you can use string[], object mapping, or SelectColumn[]. For POST endpoints, SelectColumn[] is recommended for type safety.
