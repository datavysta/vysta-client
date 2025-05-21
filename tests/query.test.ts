import { ProductService, SupplierService } from '../examples/querying/services';
import { createTestClient, authenticateClient } from './setup';
import { IReadonlyDataService, IDataService } from '../src/IDataService';
import { Product, Supplier } from '../examples/querying/types';
import { FileType, SelectColumn } from '../src/types';
import { Aggregate } from '../src/enums';

describe('Query Operations', () => {
  const client = createTestClient();
  let products: IDataService<Product>;
  let suppliers: IReadonlyDataService<Supplier>;

  beforeAll(async () => {
    await authenticateClient(client);
    products = new ProductService(client);
    suppliers = new SupplierService(client);
  });

  beforeEach(async () => {
    await authenticateClient(client);
  });

  describe('Basic Operations', () => {
    it('should get all products', async () => {
      const allProducts = await products.getAll({
        recordCount: true,
      });

      // More specific array checks
      expect(typeof allProducts.data).toBe('object');
      expect(allProducts.data.constructor.name).toBe('Array');
      expect(Array.isArray(allProducts.data)).toBe(true);
      expect(allProducts.data.length).toBeGreaterThan(0);
      expect(allProducts.count).toBeGreaterThan(0);
      expect(allProducts.error).toBeNull();

      // Check first item structure
      const firstItem = allProducts.data[0];
      expect(typeof firstItem).toBe('object');
      expect(firstItem).not.toBeNull();
    });

    it('should get product by id', async () => {
      const productId = 1;
      const product = await products.getById(productId);
      expect(product).not.toBeNull();
      expect(product.productId).toBe(productId);
      expect(typeof product.productName).toBe('string');
    });
  });

  describe('Comparison Operators', () => {
    it('eq - equals', async () => {
      const result = await products.getAll({
        select: ['productId', 'discontinued'],
        filters: {
          discontinued: { eq: false },
        },
      });
      expect(result.data[0].discontinued).toBe(false);
    });

    it('gt - greater than', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { gt: 20 },
        },
      });
      expect(result.data[0].unitPrice).toBeGreaterThan(20);
    });

    it('gte - greater than or equal', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { gte: 20 },
        },
      });
      expect(result.data[0].unitPrice).toBeGreaterThanOrEqual(20);
    });

    it('lt - less than', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { lt: 10 },
        },
      });
      expect(result.data[0].unitPrice).toBeLessThan(10);
    });

    it('lte - less than or equal', async () => {
      const result = await products.getAll({
        select: ['productId', 'unitPrice'],
        filters: {
          unitPrice: { lte: 10 },
        },
      });
      expect(result.data[0].unitPrice).toBeLessThanOrEqual(10);
    });
  });

  describe('Array Operators', () => {
    it('in - included in array', async () => {
      const result = await products.getAll({
        select: ['productId', 'categoryId'],
        filters: {
          categoryId: { in: [1, 2] },
        },
      });
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(product => {
        expect([1, 2]).toContain(product.categoryId);
      });
    });

    it('nin - not included in array', async () => {
      const result = await products.getAll({
        select: ['productId', 'categoryId'],
        filters: {
          categoryId: { nin: [1, 2] },
        },
      });
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(product => {
        expect([1, 2]).not.toContain(product.categoryId);
      });
    });
  });

  describe('Null Operators', () => {
    it('isnull - is null', async () => {
      const result = await suppliers.getAll({
        select: ['supplierId', 'region'],
        filters: {
          region: { isnull: true },
        },
        recordCount: true,
      });
      expect(result.count).toBeGreaterThan(0);
      expect(result.data[0].region).toBeNull();
      expect(result.count).toBeDefined();
    });

    it('isnotnull - is not null', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        filters: {
          productName: { isnotnull: true },
        },
      });
      expect(result.data[0].productName).toBeTruthy();
    });
  });

  describe('String Pattern Operators', () => {
    it('like - pattern matching', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        filters: {
          productName: { like: '%Aniseed%' },
        },
      });
      expect(result.data[0].productName).toMatch(/Aniseed/i);
      expect(result.data[0].productName).toBe('Aniseed Syrup');
    });

    it('nlike - negative pattern matching', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        filters: {
          productName: { nlike: '%Chai%' },
        },
      });
      expect(result.data[0].productName).not.toMatch(/Chai/i);
    });
  });

  describe('Error Handling', () => {
    it('returns empty array for non-existent records', async () => {
      const result = await suppliers.getAll({
        select: ['supplierId', 'companyName'],
        recordCount: true,
        filters: {
          companyName: { eq: 'NON_EXISTENT_SUPPLIER' },
        },
      });
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.error).toBeNull();
    });
  });

  describe('Search Query Alises', () => {
    it('q - select alias', async () => {
      const result = await products.getAll({
        select: { productId: 'id', productName: 'name', unitPrice: 'price' },
        q: 'tea',
        filters: {
          unitPrice: { gt: 9 },
        },
      });
      expect(result.data.length).toBeGreaterThan(0);
      const row: any = result.data[0];
      expect(row.name.toLowerCase()).toContain('tea');
      expect(row.price).toBeGreaterThan(9);
    });
  });

  describe('Search Query Alises', () => {
    it('select alias', async () => {
      const result = await products.getAll({
        select: { productId: 'id', productName: 'name', unitPrice: 'price' },
        q: 'tea',
        filters: {
          unitPrice: { gt: 9 },
        },
      });
      expect(result.data.length).toBeGreaterThan(0);
      const row: any = result.data[0];
      expect(row.id).toBeDefined();
      expect(row.name.toLowerCase()).toContain('tea');
      expect(row.price).toBeGreaterThan(9);
    });
  });

  describe('Search Query', () => {
    it('q - full text search', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        q: 'chai',
      });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].productName.toLowerCase()).toContain('chai');
    });

    it('q - returns empty array for non-matching search', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        q: 'nonexistentproduct123456789',
        recordCount: true,
      });
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('q - combines with other filters', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName', 'unitPrice'],
        q: 'tea',
        filters: {
          unitPrice: { gt: 9 },
        },
      });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].productName.toLowerCase()).toContain('tea');
      expect(result.data[0].unitPrice).toBeGreaterThan(9);
    });

    it('q - returns empty array for non-matching search', async () => {
      const result = await products.getAll({
        select: ['productId', 'productName'],
        q: 'nonexistentproduct123456789',
        recordCount: true,
      });
      expect(result.data).toEqual([]);
      expect(result.count).toBe(0);
    });
  });

  describe('Download', () => {
    it('csv', async () => {
      const result = await products.download(
        {
          select: ['productId', 'productName', 'unitsInStock', 'unitsOnOrder'],
        },
        FileType.CSV,
      );
      const length = result.size;
      expect(length).toBeGreaterThan(0);
    });

    it('excel', async () => {
      const result = await products.download(
        {
          select: ['productId', 'productName', 'unitsInStock', 'unitsOnOrder'],
        },
        FileType.EXCEL,
      );
      const length = result.size;
      expect(length).toBeGreaterThan(0);
    });
  });

  describe('Conditions', () => {
    it('should query with complex conditions', async () => {
      const result = await products.query({
        select: ['productId', 'productName', 'unitsInStock', 'unitsOnOrder'],
        conditions: [
          {
            id: 'e94252f2-8328-4b3b-a704-99cfa4ac7ee8',
            type: 'Group',
            children: [
              {
                id: '5f68e842-e9f8-4f31-924f-1f38c270aa4e',
                type: 'Expression',
                comparisonOperator: 'GreaterThan',
                children: [],
                valid: true,
                active: true,
                columnName: 'unitsInStock',
                values: ['0'],
              },
              {
                id: '753aaa1e-023e-4283-ac6f-951f06a0fb4e',
                type: 'Expression',
                comparisonOperator: 'GreaterThan',
                children: [],
                valid: true,
                active: true,
                columnName: 'unitsOnOrder',
                values: ['0'],
              },
              {
                id: '753aaa1e-023e-4283-ac6f-951f06a0fb4e',
                type: 'Expression',
                comparisonOperator: 'IsNotNull',
                children: [],
                valid: true,
                active: true,
                columnName: 'productName',
                values: [],
              },
            ],
            valid: true,
            values: [],
            active: true,
          },
        ],
        recordCount: true,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].unitsInStock).toBeGreaterThan(0);
      expect(result.data[0].unitsOnOrder).toBeGreaterThan(0);
    });
  });

  describe('Select parameter (GET and POST)', () => {
    it('GET: should support select as a single string column', async () => {
      const result = await products.getAll({ select: ['productId'] });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].productId).toBeDefined();
    });

    it('GET: should support select as object mapping (alias)', async () => {
      const result = await products.getAll({ select: { productId: 'id' } });
      expect(result.data.length).toBeGreaterThan(0);
      expect((result.data[0] as any).id).toBeDefined();
    });

    it('POST /query: should support select as a single string column', async () => {
      const result = await products.query({ select: ['productId'] });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].productId).toBeDefined();
    });

    it('POST /query: should support select as SelectColumn[] with aggregate/alias', async () => {
      const select: SelectColumn<Product>[] = [
        { name: 'unitPrice', aggregate: Aggregate.SUM, alias: 'total' },
        { name: 'productId' },
      ];
      const result = await products.query({ select });
      expect(result.data.length).toBeGreaterThan(0);
      expect((result.data[0] as any).total).toBeDefined();
    });

    it('POST /query: should support select as string[] with aggregate and alias', async () => {
      const result = await products.query({
        select: [
          'AVG(unitPrice)=avgUnitPrice',
          'SUM(unitsInStock)=totalUnitsInStock',
        ] as any,
      });
      expect(result.data.length).toBeGreaterThan(0);
      const row = result.data[0] as any;
      expect(row.avgUnitPrice).toBeDefined();
      expect(row.totalUnitsInStock).toBeDefined();
    });
  });

  describe('Sorting', () => {
    it('should sort products by categoryId ascending and unitPrice descending', async () => {
      const result = await products.getAll({
        select: ['productId', 'categoryId', 'unitPrice'],
        order: {
          categoryId: 'asc',
          unitPrice: 'desc',
        },
      });
      expect(result.data.length).toBeGreaterThan(1);
      // Check that the array is sorted by categoryId asc, then unitPrice desc
      for (let i = 1; i < result.data.length; i++) {
        const prev = result.data[i - 1];
        const curr = result.data[i];
        if ((prev.categoryId ?? 0) === (curr.categoryId ?? 0)) {
          expect((prev.unitPrice ?? 0)).toBeGreaterThanOrEqual((curr.unitPrice ?? 0));
        } else {
          expect((prev.categoryId ?? 0)).toBeLessThanOrEqual((curr.categoryId ?? 0));
        }
      }
    });
  });

  describe('Query with unitPrice and unitsInStock ascending, limit and offset', () => {
    it('should query products with unitPrice and unitsInStock ascending, limit and offset', async () => {
      const result = await products.query({
        select: [
          'productId',
          'productName',
          'unitPrice',
          'unitsInStock',
          'discontinued',
        ],
        limit: 50,
        offset: 0,
        order: {
          unitPrice: 'asc',
          unitsInStock: 'asc',
        },
        recordCount: true,
      });
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.length).toBeLessThanOrEqual(50);
      expect(result.count).toBeDefined();
      // Check sorting: unitPrice asc, then unitsInStock asc
      for (let i = 1; i < result.data.length; i++) {
        const prev = result.data[i - 1];
        const curr = result.data[i];
        if ((prev.unitPrice ?? 0) === (curr.unitPrice ?? 0)) {
          expect((prev.unitsInStock ?? 0)).toBeLessThanOrEqual((curr.unitsInStock ?? 0));
        } else {
          expect((prev.unitPrice ?? 0)).toBeLessThanOrEqual((curr.unitPrice ?? 0));
        }
      }
    });
  });
});
