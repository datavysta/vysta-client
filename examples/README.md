# Vysta Client Examples

This directory contains example applications demonstrating how to use the Vysta Client library.

## Examples

### Authentication Example
A sample application demonstrating:
- Password-based authentication
- OAuth provider integration
- Token handling and storage
- Redirect handling for OAuth flows

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
- Workflow Example: http://localhost:5173/workflows/workflow.html

### Example Files

- `querying/grid.html` - AG Grid integration example with infinite scrolling and server-side row model
  - Uses record count header for accurate total rows
  - Implements server-side sorting and filtering
  - Demonstrates efficient data loading with pagination
- `crud/products.html` - Product management with CRUD operations
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