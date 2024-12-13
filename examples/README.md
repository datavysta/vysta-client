# Vysta Client Examples

This directory contains example applications demonstrating how to use the Vysta Client library.

## Examples

### Querying Example
A sample application demonstrating:
- Authentication
- CRUD operations
- Filtering
- Sorting
- Pagination
- AG Grid integration

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
- Grid Example: http://localhost:3000/querying/grid.html
- CRUD Example: http://localhost:3000/crud/products.html

### Example Files

- `querying/grid.html` - AG Grid integration example with infinite scrolling
- `crud/products.html` - Product management with CRUD operations
- `services.ts` - Service definitions for entities
- `types.ts` - TypeScript interfaces for data schema

### Configuration

The examples expect a Vysta server running at `http://localhost:8080` with:
- Default credentials: test@datavysta.com / password
- Database connection named "Northwinds"

You can modify these settings in the example files as needed. 