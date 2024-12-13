import { VystaService } from '../../src/base/VystaService';
import { VystaClient } from '../../src/VystaClient';
import { Customer, Order, Product, Supplier } from './types';

export class ProductService extends VystaService<Product> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'products', {
      primaryKey: 'product_id'
    });
  }
}

export class OrderService extends VystaService<Order> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'orders', {
      primaryKey: 'order_id'
    });
  }
}

export class CustomerService extends VystaService<Customer> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'customers', {
      primaryKey: 'customer_id'
    });
  }
}

export class SupplierService extends VystaService<Supplier> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'suppliers', {
      primaryKey: 'supplier_id'
    });
  }
} 