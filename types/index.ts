export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  last_price: number;
  created_at: Date;
  updated_at: Date;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string | null;
  address: string | null;
  created_at: Date;
  updated_at: Date;
}

export type IntendStatus = 'pending' | 'partially_fulfilled' | 'fulfilled';

export interface Intend {
  id: string;
  intend_number: string | null;
  name: string;
  vendor_id: string | null;
  status: IntendStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IntendItem {
  id: string;
  intend_id: string;
  ingredient_id: string;
  quantity: number;
  po_item_id: string | null; // Flag: truthy if item exists in po_items.intend_item_id (not actual po_item.id)
  selected?: boolean;
  order_quantity?: number;
  created_at: Date;
}

export interface IntendWithItems extends Intend {
  items: (IntendItem & { ingredient: Ingredient })[];
}

export interface IntendWithVendor extends Intend {
  vendor: Vendor | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  intend_id: string | null;
  vendor_id: string;
  status: 'pending' | 'confirmed' | 'partially_received' | 'received';
  total_amount: number;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface POItem {
  id: string;
  po_id: string;
  intend_item_id: string | null;
  ingredient_id: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
}

export interface POWithDetails extends PurchaseOrder {
  vendor: Vendor;
  items: Array<POItem & { ingredient: Ingredient }>;
}

export interface GRN {
  id: string;
  grn_number: string;
  po_id: string;
  received_date: string;
  received_by: string | null;
  notes: string | null;
  status: 'draft' | 'completed';
  created_at: Date;
  updated_at: Date;
}

export interface GRNItem {
  id: string;
  grn_id: string;
  po_item_id: string;
  ingredient_id: string;
  quantity_ordered: number;
  quantity_received: number;
  variance: number;
  unit_price_ordered: number;
  unit_price_actual: number;
  price_variance: number;
  total_amount: number;
  remarks: string | null;
  created_at: Date;
}

export interface GRNWithDetails extends GRN {
  po: {
    po_number: string;
    vendor: {
      name: string;
    };
  };
  items: Array<GRNItem & {
    ingredient: {
      name: string;
      unit: string;
    };
  }>;
}

export interface SalesComparison {
  current_month_mtd_revenue: number;
  current_month_mtd_cost: number;
  current_month_mtd_profit: number;
  current_month_mtd_orders: number;

  previous_month_mtd_revenue: number;
  previous_month_mtd_cost: number;
  previous_month_mtd_profit: number;
  previous_month_mtd_orders: number;

  previous_month_full_revenue: number;
  previous_month_full_cost: number;
  previous_month_full_profit: number;
  previous_month_full_orders: number;
}

export interface SalesMetric {
  label: string;
  current: number;
  previousMTD: number;
  previousFull: number;
  mtdChange: number;
  mtdChangePercent: number;
  fullChange: number;
  fullChangePercent: number;
}

export interface IngredientMovementAnalysis {
  ingredient_id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  last_price: number;
  consumption_last_30_days: number;
  consumption_last_7_days: number;
  received_last_30_days: number;
  transaction_count_30_days: number;
  last_consumed_date: string | null;
  value_consumed_30_days: number;
  avg_daily_consumption: number;
  days_until_stockout: number | null;
  turnover_ratio: number | null;
  avg_daily_transactions: number;
  days_since_last_consumed: number | null;
  movement_category: 'fast_moving' | 'medium_moving' | 'slow_moving' | 'dead_stock' | 'no_data';
  stock_status: 'critical' | 'low' | 'adequate' | 'overstocked' | 'dead_stock' | 'unknown';
  recipes_count: number;
}

export interface MovementStats {
  fast_moving: number;
  medium_moving: number;
  slow_moving: number;
  dead_stock: number;
  total_items: number;
}

export type UserRole = 'admin' | 'accounts' | 'manager' | 'staff';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

