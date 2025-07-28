import { VystaService, VystaReadonlyService, VystaClient } from '../../src/index.js';
import { Customer, Order, Product, Supplier, OrderDetails, CustomerSummary } from './types';

interface ProductWithValue extends Product {
  _totalStockValue: number;
}

export class ProductService extends VystaService<Product, ProductWithValue> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Products', {
      primaryKey: 'productId',
    });
  }

  protected override hydrate(product: Product): ProductWithValue {
    return {
      ...product,
      _totalStockValue: (product?.unitPrice ?? 0) * (product?.unitsInStock ?? 0),
    };
  }
}

export class OrderService extends VystaService<Order> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Orders', {
      primaryKey: 'orderId',
    });
  }
}

export class CustomerService extends VystaService<Customer> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Customers', {
      primaryKey: 'customerId',
    });
  }
}

export class SupplierService extends VystaService<Supplier> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Suppliers', {
      primaryKey: 'supplierId',
    });
  }
}

export class OrderDetailsService extends VystaService<OrderDetails> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'OrderDetails', {
      primaryKey: ['orderId', 'productId'],
    });
  }
}

export class CustomerSummaryService extends VystaReadonlyService<CustomerSummary> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'CustomerSummary');
  }
}
