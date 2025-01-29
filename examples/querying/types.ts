export interface Customer {
  customerId: string;
  companyName: string;
  contactName?: string;
  contactTitle?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  fax?: string;
}

export interface Product {
  productId: number;
  productName: string;
  supplierId?: number;
  categoryId?: number;
  quantityPerUnit?: string;
  unitPrice?: number;
  unitsInStock?: number;
  unitsOnOrder?: number;
  reorderLevel?: number;
  discontinued: number;
}

export interface Order {
  orderId: number;
  customerId?: string;
  employeeId?: number;
  orderDate?: string;
  requiredDate?: string;
  shippedDate?: string;
  shipVia?: number;
  freight?: number;
  shipName?: string;
  shipAddress?: string;
  shipCity?: string;
  shipRegion?: string;
  shipPostalCode?: string;
  shipCountry?: string;
}

export interface Supplier {
  supplierId: number;
  companyName: string;
  contactName?: string;
  contactTitle?: string;
  address?: string;
  city?: string;
  region?: string | null;
  postalCode?: string;
  country?: string;
  phone?: string;
  fax?: string;
  homepage?: string;
}

export interface OrderDetails {
  orderId: number;
  productId: number;
  unitPrice: number;
  quantity: number;
  discount: number;
} 