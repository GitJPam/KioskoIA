import { z } from "zod";

// ============================================
// AUTH VALIDATIONS
// ============================================

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["ADMIN", "TENDERO", "PADRE"]).optional(),
  phone: z.string().optional(),
});

// ============================================
// PRODUCT VALIDATIONS
// ============================================

export const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, "La categoría es requerida"),
  costPrice: z.number().min(0, "El precio de costo debe ser mayor o igual a 0"),
  salePrice: z.number().min(0, "El precio de venta debe ser mayor o igual a 0"),
  stock: z.number().int().min(0, "El stock debe ser mayor o igual a 0"),
  minStock: z.number().int().min(0, "El stock mínimo debe ser mayor o igual a 0").default(10),
  maxStock: z.number().int().min(0, "El stock máximo debe ser mayor o igual a 0").default(100),
  isHealthy: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  image: z.string().optional(),
});

export const productUpdateSchema = productSchema.partial();

// ============================================
// CATEGORY VALIDATIONS
// ============================================

export const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido").default("#059669"),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

// ============================================
// SALE VALIDATIONS
// ============================================

export const saleItemSchema = z.object({
  productId: z.string().min(1, "El producto es requerido"),
  quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Debe haber al menos un producto"),
  paymentMethod: z.enum(["EFECTIVO", "NEQUI", "DAVIPLATA", "TRANSFERENCIA", "SALDO_PREPAGO", "OTRO"]),
  customerName: z.string().optional(),
  notes: z.string().optional(),
  deviceId: z.string().optional(),
});

// ============================================
// INVENTORY VALIDATIONS
// ============================================

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().min(1, "El producto es requerido"),
  changeType: z.enum(["AJUSTE", "DEVOLUCION", "PERDIDA"]),
  quantity: z.number().int(),
  reason: z.string().optional(),
});

// ============================================
// SUPPLIER VALIDATIONS
// ============================================

export const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ============================================
// PURCHASE ORDER VALIDATIONS
// ============================================

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "El producto es requerido"),
  quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
  unitCost: z.number().min(0, "El costo debe ser mayor o igual a 0"),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "El proveedor es requerido"),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Debe haber al menos un producto"),
});

// ============================================
// REPORT VALIDATIONS
// ============================================

export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
});

export const comparativeSchema = z.object({
  period1Start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  period1End: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  period2Start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  period2End: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type ComparativeInput = z.infer<typeof comparativeSchema>;
