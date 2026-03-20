// KioskoIA - Constantes de la aplicación

export const APP_NAME = "KioskoIA";
export const APP_TAGLINE = "Tu tienda escolar inteligente";
export const APP_VERSION = "1.0.0";

// Colores de la marca
export const COLORS = {
  primary: "#059669",
  primaryLight: "#10B981",
  primaryDark: "#047857",
  secondary: "#F59E0B",
  secondaryDark: "#D97706",
  alert: "#EF4444",
  info: "#3B82F6",
  gray: "#6B7280",
  grayLight: "#F3F4F6",
  white: "#FFFFFF",
  black: "#111827",
} as const;

// Métodos de pago
export const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo", icon: "💵" },
  { value: "NEQUI", label: "Nequi", icon: "📱" },
  { value: "DAVIPLATA", label: "Daviplata", icon: "📱" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: "🏦" },
  { value: "SALDO_PREPAGO", label: "Saldo Prepago", icon: "💳" },
  { value: "OTRO", label: "Otro", icon: "💰" },
] as const;

// Roles de usuario
export const USER_ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "TENDERO", label: "Tendero" },
  { value: "PADRE", label: "Padre de familia" },
] as const;

// Estados de pedido
export const ORDER_STATUS = [
  { value: "PENDIENTE", label: "Pendiente", color: "#F59E0B" },
  { value: "ENVIADO", label: "Enviado", color: "#3B82F6" },
  { value: "RECIBIDO_PARCIAL", label: "Recibido parcial", color: "#F97316" },
  { value: "RECIBIDO_COMPLETO", label: "Recibido completo", color: "#10B981" },
  { value: "CANCELADO", label: "Cancelado", color: "#EF4444" },
] as const;

// Tipos de cambio de inventario
export const CHANGE_TYPES = [
  { value: "VENTA", label: "Venta", color: "#3B82F6" },
  { value: "AJUSTE", label: "Ajuste", color: "#F59E0B" },
  { value: "COMPRA", label: "Compra", color: "#10B981" },
  { value: "DEVOLUCION", label: "Devolución", color: "#8B5CF6" },
  { value: "PERDIDA", label: "Pérdida", color: "#EF4444" },
] as const;

// Configuración de paginación
export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

// Configuración de alertas de stock
export const STOCK_ALERTS = {
  critical: 5, // Menos de 5 unidades
  low: 10, // Menos de 10 unidades
  warning: 20, // Menos de 20 unidades
} as const;

// Formato de moneda
export const CURRENCY = {
  code: "COP",
  symbol: "$",
  locale: "es-CO",
  decimals: 0,
} as const;

// Formateador de moneda
export const CURRENCY_CONFIG = {
  format: (value: number): string => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },
};

// Formato de fechas
export const DATE_FORMATS = {
  short: "dd/MM/yyyy",
  long: "dd/MM/yyyy HH:mm",
  time: "HH:mm",
  invoice: "yyyyMMdd",
} as const;

// Mensajes de error
export const ERROR_MESSAGES = {
  unauthorized: "No tienes autorización para realizar esta acción",
  notFound: "Recurso no encontrado",
  validationError: "Error de validación",
  serverError: "Error interno del servidor",
  invalidCredentials: "Credenciales inválidas",
  emailExists: "El email ya está registrado",
  productNotFound: "Producto no encontrado",
  insufficientStock: "Stock insuficiente",
  saleNotFound: "Venta no encontrada",
} as const;

// Mensajes de éxito
export const SUCCESS_MESSAGES = {
  loginSuccess: "Sesión iniciada correctamente",
  logoutSuccess: "Sesión cerrada correctamente",
  productCreated: "Producto creado correctamente",
  productUpdated: "Producto actualizado correctamente",
  productDeleted: "Producto eliminado correctamente",
  saleCreated: "Venta registrada correctamente",
  syncCompleted: "Sincronización completada",
} as const;
