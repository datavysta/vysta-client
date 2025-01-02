import { VystaService } from '../../src/base/VystaService';
import { VystaClient } from '../../src/VystaClient';
import { Customer, Order, Product, Supplier } from './types';

export class ProductService extends VystaService<Product> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Products', {
      primaryKey: 'productId'
    });
  }
}

export class OrderService extends VystaService<Order> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Orders', {
      primaryKey: 'orderId'
    });
  }
}

export class CustomerService extends VystaService<Customer> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Customers', {
      primaryKey: 'customerId'
    });
  }
}

export class SupplierService extends VystaService<Supplier> {
  constructor(client: VystaClient) {
    super(client, 'Northwinds', 'Suppliers', {
      primaryKey: 'supplierId'
    });
  }
} 