// KioskoIA - Tipos TypeScript

// ============================================
// USUARIOS
// ============================================

export type Role = "ADMIN" | "TENDERO" | "PADRE";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string | null;
  avatar?: string | null;
  isActive: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserWithoutPassword = User;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
  role?: Role;
  phone?: string;
}

// ============================================
// PRODUCTOS Y CATEGORÍAS
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId: string;
  category?: Category;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  isHealthy: boolean;
  isAvailable: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

// ============================================
// INVENTARIO
// ============================================

export type ChangeType = "VENTA" | "AJUSTE" | "COMPRA" | "DEVOLUCION" | "PERDIDA";

export interface InventoryLog {
  id: string;
  productId: string;
  product?: Product;
  changeType: ChangeType;
  quantity: number;
  reason?: string | null;
  previousStock: number;
  newStock: number;
  userId?: string | null;
  user?: User;
  createdAt: Date;
}

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  urgency: "critical" | "warning" | "normal";
  category?: string;
  stockPercentage?: number;
}

// ============================================
// VENTAS
// ============================================

export type PaymentMethod = "EFECTIVO" | "NEQUI" | "DAVIPLATA" | "TRANSFERENCIA" | "SALDO_PREPAGO" | "OTRO";
export type PaymentStatus = "PENDIENTE" | "COMPLETADA" | "CANCELADA" | "DEVUELTA";

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  createdAt: Date;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  userId: string;
  user?: User;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName?: string | null;
  notes?: string | null;
  isSynced: boolean;
  syncedAt?: Date | null;
  deviceId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: SaleItem[];
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
  user: User;
}

export interface CreateSaleData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod: PaymentMethod;
  customerName?: string;
  notes?: string;
  deviceId?: string;
}

// ============================================
// PROVEEDORES Y COMPRAS
// ============================================

export type OrderStatus = "PENDIENTE" | "ENVIADO" | "RECIBIDO_PARCIAL" | "RECIBIDO_COMPLETO" | "CANCELADO";

export interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: number;
  subtotal: number;
  receivedQty: number;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  status: OrderStatus;
  total: number;
  orderDate: Date;
  expectedDate?: Date | null;
  receivedDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: PurchaseItem[];
}

// ============================================
// REPORTES
// ============================================

export interface DailyReport {
  date: string;
  totalSales: number;
  salesCount: number;
  itemsSold: number;
  averageTicket: number;
  paymentMethods: Record<PaymentMethod, number>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    total: number;
  }>;
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  totalSales: number;
  salesCount: number;
  dailyAverage: number;
  bestDay: { date: string; total: number };
  worstDay: { date: string; total: number };
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    total: number;
  }>;
  dailyData: Array<{ date: string; total: number; count: number }>;
}

export interface MonthlyReport {
  month: number;
  year: number;
  totalSales: number;
  salesCount: number;
  dailyAverage: number;
  weeklyData: Array<{ week: number; total: number; count: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    total: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    total: number;
    percentage: number;
  }>;
}

export interface ComparativeReport {
  period1: {
    start: string;
    end: string;
    total: number;
    salesCount: number;
    averageTicket: number;
  };
  period2: {
    start: string;
    end: string;
    total: number;
    salesCount: number;
    averageTicket: number;
  };
  difference: {
    total: number;
    percentage: number;
    trend: "up" | "down" | "equal";
  };
  insights?: string;
}

// ============================================
// PREDICCIONES IA
// ============================================

export interface StockPrediction {
  productId: string;
  productName: string;
  currentStock: number;
  dailySalesRate: number;
  daysUntilEmpty: number;
  estimatedEmptyDate: string;
  urgency: "critical" | "warning" | "normal";
  suggestedOrderQuantity: number;
  category?: string;
}

export interface OrderSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  suggestedQuantity: number;
  estimatedCost: number;
  supplier?: Supplier;
  reason: string;
}

export interface AIInsight {
  type: "stock_alert" | "sales_trend" | "recommendation" | "anomaly";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  data?: Record<string, unknown>;
  createdAt: Date;
}

// ============================================
// API RESPONSES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingItems: number;
  lastSync?: Date;
  isSyncing: boolean;
}

export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  syncStatus: SyncStatus;
}
