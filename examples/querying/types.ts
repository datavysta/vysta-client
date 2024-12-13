export interface Customer {
  customer_id: string;
  company_name: string;
  contact_name?: string;
  contact_title?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  fax?: string;
}

export interface Product {
  product_id: number;
  product_name: string;
  supplier_id?: number;
  category_id?: number;
  quantity_per_unit?: string;
  unit_price?: number;
  units_in_stock?: number;
  units_on_order?: number;
  reorder_level?: number;
  discontinued: number;
}

export interface Order {
  order_id: number;
  customer_id?: string;
  employee_id?: number;
  order_date?: string;
  required_date?: string;
  shipped_date?: string;
  ship_via?: number;
  freight?: number;
  ship_name?: string;
  ship_address?: string;
  ship_city?: string;
  ship_region?: string;
  ship_postal_code?: string;
  ship_country?: string;
}

export interface Supplier {
  supplier_id: number;
  company_name: string;
  contact_name?: string;
  contact_title?: string;
  address?: string;
  city?: string;
  region?: string | null;
  postal_code?: string;
  country?: string;
  phone?: string;
  fax?: string;
  homepage?: string;
} 