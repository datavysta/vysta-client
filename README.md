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

## Password Reset and Invitation Authentication

The Vysta client provides comprehensive support for password reset and invitation workflows. These endpoints work without authentication, allowing users to reset their passwords or accept invitations when they're not logged in.

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `forgotPassword` | Initiates password reset for user | `email: string` | `Promise<ForgotPasswordResponse>` |
| `validateCode` | Validates reset code or invitation | `params: ValidateCodeParams` | `Promise<ValidateCodeResponse>` |
| `validateInvitation` | Validates invitation using just ID | `params: ValidateInvitationParams` | `Promise<ValidateInvitationResponse>` |
| `changePassword` | Changes password using reset code | `params: ChangePasswordParams` | `Promise<ChangePasswordResponse>` |
| `acceptInvitation` | Accepts invitation and sets password | `params: AcceptInvitationParams` | `Promise<AcceptInvitationResponse>` |

### Types and Enums

```typescript
// Status enum for password reset operations
enum PasswordResetStatus {
  VALID = 0,
  EXPIRED = 1,
  NOT_FOUND = 2,
  INVALID_CODE = 3,
  COMPLETED = 4,
  PASSWORDS_MUST_MATCH = 5,
  PASSWORD_REUSED = 6,
}

// Status enum for invitation operations
enum InvitationStatus {
  VALID = 0,
  EXPIRED = 1,
  NOT_FOUND = 2,
  ALREADY_ACCEPTED = 3,
}



// Forgot Password
interface ForgotPasswordResponse {
  exists: boolean;  // Whether the user exists in the system
}

// Validate Code
interface ValidateCodeParams {
  email: string;           // Required for password reset
  code: string;            // Required for password reset
}

interface ValidateCodeResponse {
  status: PasswordResetStatus;
}

// Validate Invitation
interface ValidateInvitationParams {
  id: string;
}

interface ValidateInvitationResponse {
  status: InvitationStatus;
}

// Change Password
interface ChangePasswordParams {
  email: string;
  code: string;
  password: string;
  passwordConfirmed: string;
}

interface ChangePasswordResponse {
  status: PasswordResetStatus;
  authenticationResult?: AuthResult;  // Optional auto-login
}

// Accept Invitation
interface AcceptInvitationParams {
  id: string;
  password: string;
  passwordConfirmed: string;
}

interface AcceptInvitationResponse {
  status: PasswordResetStatus;
  authenticationResult?: AuthResult;  // Optional auto-login
}
```

### Password Reset Workflow

Complete password reset flow with validation and error handling:

```typescript
import { 
  VystaClient, 
  PasswordResetStatus,
  InvitationStatus
} from '@datavysta/vysta-client';

const client = new VystaClient({
  baseUrl: 'https://api.example.com'
});

async function resetPassword(email: string, newPassword: string) {
  try {
    // Step 1: Initiate password reset
    const forgotResponse = await client.forgotPassword(email);
    
    if (!forgotResponse.exists) {
      throw new Error('User not found');
    }
    
    console.log('Password reset email sent');
    
    // Step 2: User receives email with reset code
    // In a real app, you would get this from user input
    const resetCode = 'code-from-email';
    
    // Step 3: Validate the reset code
    const validateResponse = await client.validateCode({
      email: email,
      code: resetCode
    });
    
    if (validateResponse.status !== PasswordResetStatus.VALID) {
      const statusMessages = {
        [PasswordResetStatus.INVALID_CODE]: 'Invalid reset code',
        [PasswordResetStatus.EXPIRED]: 'Reset code has expired',
        [PasswordResetStatus.COMPLETED]: 'Reset code already used',
        [PasswordResetStatus.NOT_FOUND]: 'Reset code not found',
        [PasswordResetStatus.PASSWORDS_MUST_MATCH]: 'Passwords must match',
        [PasswordResetStatus.PASSWORD_REUSED]: 'Cannot reuse previous password'
      };
      throw new Error(statusMessages[validateResponse.status] || 'Unknown error');
    }
    
    // Step 4: Change password
    const changeResponse = await client.changePassword({
      email: email,
      code: resetCode,
      password: newPassword,
      passwordConfirmed: newPassword
    });
    
    if (changeResponse.status === PasswordResetStatus.VALID || changeResponse.status === PasswordResetStatus.COMPLETED) {
      console.log('Password changed successfully');
      
      // Check if user was automatically logged in
      if (changeResponse.authenticationResult) {
        console.log('User automatically logged in');
        // Client is now authenticated and ready to make API calls
      }
    }
    
  } catch (error) {
    console.error('Password reset failed:', error.message);
    throw error;
  }
}

// Usage
await resetPassword('user@example.com', 'newSecurePassword123');
```

### Invitation Acceptance Workflow

Complete invitation acceptance flow:

```typescript
async function acceptInvitation(invitationId: string, password: string) {
  try {
    // Step 1: Validate the invitation
    const validateResponse = await client.validateInvitation({
      id: invitationId
    });
    
    if (validateResponse.status !== InvitationStatus.VALID) {
      const statusMessages = {
        [InvitationStatus.EXPIRED]: 'Invitation has expired',
        [InvitationStatus.NOT_FOUND]: 'Invitation not found',
        [InvitationStatus.ALREADY_ACCEPTED]: 'Invitation already accepted'
      };
      throw new Error(statusMessages[validateResponse.status] || 'Unknown error');
    }
    
    // Step 2: Accept invitation and set password
    const acceptResponse = await client.acceptInvitation({
      id: invitationId,
      password: password,
      passwordConfirmed: password
    });
    
    if (acceptResponse.status === PasswordResetStatus.VALID || acceptResponse.status === PasswordResetStatus.COMPLETED) {
      console.log('Invitation accepted successfully');
      
      // Check if user was automatically logged in
      if (acceptResponse.authenticationResult) {
        console.log('User automatically logged in');
        // Client is now authenticated and ready to make API calls
      }
    }
    
  } catch (error) {
    console.error('Invitation acceptance failed:', error.message);
    throw error;
  }
}

// Usage
await acceptInvitation('invitation-uuid-123', 'newSecurePassword123');
```

### Error Handling

Both password reset and invitation flows include comprehensive error handling:

```typescript
async function handlePasswordResetErrors() {
  try {
    // For password reset code validation
    const response = await client.validateCode({
      email: 'user@example.com',
      code: 'some-code'
    });
    
    switch (response.status) {
      case PasswordResetStatus.VALID:
        console.log('Code is valid, proceed with password change');
        break;
      case PasswordResetStatus.INVALID_CODE:
        console.log('Invalid code, please check and try again');
        break;
      case PasswordResetStatus.EXPIRED:
        console.log('Code has expired, request a new one');
        break;
      case PasswordResetStatus.COMPLETED:
        console.log('Code already used, request a new one');
        break;
      case PasswordResetStatus.NOT_FOUND:
        console.log('Code not found, request a new one');
        break;
      case PasswordResetStatus.PASSWORDS_MUST_MATCH:
        console.log('Passwords must match');
        break;
      case PasswordResetStatus.PASSWORD_REUSED:
        console.log('Cannot reuse previous password');
        break;
    }
  } catch (error) {
    if (error.message.includes('Code validation failed')) {
      console.log('Server error during validation');
    } else {
      console.log('Network or other error:', error.message);
    }
  }
}

async function handleInvitationErrors() {
  try {
    // For invitation validation
    const response = await client.validateInvitation({
      id: 'invitation-uuid-123'
    });
    
    switch (response.status) {
      case InvitationStatus.VALID:
        console.log('Invitation is valid, proceed with acceptance');
        break;
      case InvitationStatus.EXPIRED:
        console.log('Invitation has expired, request a new one');
        break;
      case InvitationStatus.NOT_FOUND:
        console.log('Invitation not found');
        break;
      case InvitationStatus.ALREADY_ACCEPTED:
        console.log('Invitation already accepted');
        break;
    }
  } catch (error) {
    if (error.message.includes('Invitation validation failed')) {
      console.log('Server error during invitation validation');
    } else {
      console.log('Network or other error:', error.message);
    }
  }
}
```

### Key Features

- **Unauthenticated Access**: All endpoints work without authentication tokens
- **Auto-Login**: Password change and invitation acceptance can automatically log users in
- **Comprehensive Validation**: Detailed status codes for all operations
- **Dedicated Endpoints**: Separate endpoints for password reset codes (`validateCode`) and invitations (`validateInvitation`)
- **Separate Status Enums**: Password-setting operations use `PasswordResetStatus`, invitation validation uses `InvitationStatus`
- **Error Handling**: Proper error messages and status codes
- **Type Safety**: Full TypeScript support with enums and interfaces
- **Security**: Separate endpoints for different operations with proper validation

> **Note**: Password reset operations (`forgotPassword`, `validateCode`, `changePassword`) and password-setting operations (`acceptInvitation`) use `PasswordResetStatus` enum, while invitation validation (`validateInvitation`) uses `InvitationStatus` enum. For password-setting operations, both `VALID` (0) and `COMPLETED` (4) statuses indicate success.

> **Example**: See the [Password Reset Demo](examples/auth/password-reset.html) for a complete working implementation with UI forms and error handling.

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

### Table Audit Service

The `VystaTableAuditService` provides access to audit history for database table rows, allowing you to track changes, who made them, and when they occurred.

```typescript
import { 
  VystaClient, 
  VystaTableAuditService, 
  AuditOperationType,
  ParsedAuditRecord 
} from '@datavysta/vysta-client';

const client = new VystaClient({ baseUrl: 'http://localhost:8080' });
const auditService = new VystaTableAuditService(client);

// Get raw audit history
const auditHistory = await auditService.getTableAudit(
  'Northwinds',           // connection name
  'Products',             // table name
  { productId: 123 },     // primary key fields
  { limit: 50, offset: 0 } // optional pagination
);

// Get strongly typed audit history with parsed changedFields
const parsedAudit = await auditService.getTableAuditParsed(
  'Northwinds',
  'Products', 
  { productId: 123 }
);

// Process parsed audit records (recommended approach)
parsedAudit.forEach(record => {
  console.log(`${record.username} performed ${getOperationType(record.operationType)} at ${record.timestamp}`);
  
  // changedFields is now strongly typed!
  Object.entries(record.changedFields).forEach(([field, change]) => {
    console.log(`  ${field}: ${change.before} → ${change.after}`);
    if (change.before_display || change.after_display) {
      console.log(`    Display: ${change.before_display} → ${change.after_display}`);
    }
  });
});

function getOperationType(type: number): string {
  switch (type) {
    case AuditOperationType.INSERT: return 'INSERT';
    case AuditOperationType.UPDATE: return 'UPDATE'; 
    case AuditOperationType.DELETE: return 'DELETE';
    default: return 'UNKNOWN';
  }
}
```

#### Audit Types

```typescript
// Operation type enum for audit records
enum AuditOperationType {
  INSERT = 1,
  UPDATE = 2,
  DELETE = 3,
}

// UUID type alias
type UUID = string;

// Single field change in an audit record
interface AuditFieldChange {
  before?: unknown;
  after?: unknown;
  before_display?: string;  // Human-readable before value
  after_display?: string;   // Human-readable after value
}

// Complete audit record structure
interface AuditRecord {
  id: UUID;
  name?: string | null;
  createdOn: string;
  modifiedOn?: string | null;
  connectionId: UUID;
  schemaName?: string | null;
  tableName: string;
  operationType: number;    // AuditOperationType enum value (camelCase)
  rowKey: string;          // JSON string of primary key
  changedFields: string;   // JSON string of field changes
  userId?: UUID;
  username?: string;
  timestamp: string;       // ISO 8601 timestamp
  tenantId: string;
  envId: string;
}

// Audit record with parsed changedFields (recommended for processing)
interface ParsedAuditRecord extends Omit<AuditRecord, 'changedFields'> {
  changedFields: Record<string, AuditFieldChange>;  // Strongly typed
}

// Request structure (primary key fields)
interface AuditRequest {
  [key: string]: any;      // Primary key column names to values
}

// Response structure
interface AuditResponse {
  recordCount: number;     // Total number of audit records
  results: AuditRecord[];  // Array of audit records
}
```

#### Field Change Format

The `changedFields` property contains a JSON string with before/after values. Use `getTableAuditParsed()` for strongly typed access:

```typescript
// Raw changedFields JSON string:
{
  "unitPrice": {
    "before": "25.00",
    "after": "29.99",
    "before_display": "$25.00",
    "after_display": "$29.99"
  },
  "unitsInStock": {
    "before": "10", 
    "after": "15"
  }
}

// Strongly typed access with getTableAuditParsed():
const parsedAudit = await auditService.getTableAuditParsed('Northwinds', 'Products', { productId: 123 });
parsedAudit.forEach(record => {
  // record.changedFields is now Record<string, AuditFieldChange>
  const priceChange = record.changedFields.unitPrice;
  if (priceChange) {
    console.log(`Price: ${priceChange.before} → ${priceChange.after}`);
    console.log(`Display: ${priceChange.before_display} → ${priceChange.after_display}`);
  }
});

// For INSERT operations, only "after" values are present
// For DELETE operations, only "before" values are present
// "before_display" and "after_display" provide human-readable representations
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
