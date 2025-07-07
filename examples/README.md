# Vysta Client Examples

This directory contains example applications demonstrating how to use the Vysta Client library.

## Examples

### Authentication Examples
Examples demonstrating password and OAuth authentication flows.

#### Authentication Demo - Password login and OAuth providers
A sample application demonstrating:
- Password-based authentication
- OAuth provider integration
- Token handling and storage
- Redirect handling for OAuth flows

#### Environment Switching Demo - Multi-environment authentication
A sample application demonstrating:
- Environment switching workflow
- Available environments discovery
- Token exchange between environments
- Host switching and authentication state management
- Debug information for troubleshooting

### Querying Example
A sample application demonstrating:
- Authentication
- CRUD operations
- Filtering
- Sorting
- Pagination with infinite scroll
- AG Grid integration with server-side row model
- Total record count tracking

### Workflow Example
A sample application demonstrating:
- Workflow execution
- Input/output type handling
- Async workflow operations

### Response Types

The `getAll()` method returns a `DataResult<T>` object:
```typescript
interface DataResult<T> {
  data: T[];        // Array of records
  count: number;    // Total record count (-1 if not available)
  error: Error | null;
}

// Example usage:
const result = await products.getAll();
console.log('Records:', result.data.length);
console.log('Total count:', result.count);
```

### Running the Examples

1. Install dependencies:
```bash
# Install root dependencies
npm install

# Install example dependencies
cd examples
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to:
- Grid Example: http://localhost:5173/querying/grid.html
- CRUD Example: http://localhost:5173/crud/products.html
- Auth Example: http://localhost:5173/auth/auth.html
- Environment Switching Example: http://localhost:5173/auth/environment-switching.html
- Workflow Example: http://localhost:5173/workflows/workflow.html

### Example Files

- `querying/grid.html` - AG Grid integration example with infinite scrolling and server-side row model
  - Uses record count header for accurate total rows
  - Implements server-side sorting and filtering
  - Demonstrates efficient data loading with pagination
- `crud/products.html` - Product management with CRUD operations
- `auth/auth.html` - Authentication example with password and OAuth providers
- `auth/environment-switching.html` - Environment switching example
  - Demonstrates multi-environment authentication workflow
  - Shows available environments discovery and selection
  - Handles token exchange between environments
  - Updates client host configuration dynamically
  - Provides debug information for troubleshooting
- `workflows/workflow.html` - Workflow execution example
  - Demonstrates workflow service usage
  - Shows input/output type handling
  - Includes async workflow operations
- `services.ts` - Service definitions for entities
- `types.ts` - TypeScript interfaces for data schema

### Configuration

The examples expect a Vysta server running at `http://localhost:8080` with:
- Default credentials: test@datavysta.com / password
- Database connection named "Northwinds"

Note: The examples run on port 5173 to match Okta's configured redirect URL.

You can modify these settings in the example files as needed.