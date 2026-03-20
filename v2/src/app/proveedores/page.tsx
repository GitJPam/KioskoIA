"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TruckIcon,
  ClipboardList,
  CreditCard,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  Search,
  Filter,
  Package,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

// Currency formatter
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Date formatter
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

// Status badge colors for orders
const getOrderStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ENVIADO: "bg-blue-100 text-blue-800 border-blue-200",
    RECIBIDO_PARCIAL: "bg-purple-100 text-purple-800 border-purple-200",
    RECIBIDO_COMPLETO: "bg-green-100 text-green-800 border-green-200",
    CANCELADO: "bg-gray-100 text-gray-800 border-gray-200",
  };
  const labels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    ENVIADO: "Enviado",
    RECIBIDO_PARCIAL: "Recibido Parcial",
    RECIBIDO_COMPLETO: "Recibido",
    CANCELADO: "Cancelado",
  };
  return (
    <Badge variant="outline" className={styles[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
};

// Payment status badge
const getPaymentStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    COMPLETADA: "bg-green-100 text-green-800 border-green-200",
    CANCELADA: "bg-gray-100 text-gray-800 border-gray-200",
  };
  const labels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    COMPLETADA: "Pagado",
    CANCELADA: "Cancelada",
  };
  return (
    <Badge variant="outline" className={styles[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
};

// Debt status badge
const getDebtStatusBadge = (status: string, isOverdue: boolean = false) => {
  if (isOverdue && status !== "PAGADO") {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
        Vencido
      </Badge>
    );
  }
  const styles: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
    PARCIAL: "bg-blue-100 text-blue-800 border-blue-200",
    PAGADO: "bg-green-100 text-green-800 border-green-200",
    VENCIDO: "bg-red-100 text-red-800 border-red-200",
  };
  const labels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    PARCIAL: "Parcial",
    PAGADO: "Pagado",
    VENCIDO: "Vencido",
  };
  return (
    <Badge variant="outline" className={styles[status] || ""}>
      {labels[status] || status}
    </Badge>
  );
};

// Interfaces
interface Supplier {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  paymentTerms?: number;
  notes?: string | null;
  isActive: boolean;
  ordersCount?: number;
  debtsCount?: number;
  totalDebt: number;
  createdAt: string;
}

interface SupplierDetail extends Supplier {
  stats: {
    totalOrders: number;
    totalPurchased: number;
    totalPaid: number;
    totalDebt: number;
    overdueDebts: number;
    overdueAmount: number;
    ordersByStatus: { status: string; count: number }[];
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    orderDate: string;
    paymentStatus: string;
  }[];
  pendingDebts: {
    id: string;
    amount: number;
    paidAmount: number;
    pendingAmount: number;
    dueDate: string | null;
    status: string;
  }[];
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier: { id: string; name: string; phone?: string | null };
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  orderDate: string;
  expectedDate?: string | null;
  dueDate?: string | null;
  paymentStatus: string;
  paidAmount: number;
  pendingAmount: number;
  notes?: string | null;
  itemsCount: number;
}

interface OrderDetail extends PurchaseOrder {
  items: {
    id: string;
    productId: string;
    product: {
      id: string;
      name: string;
      category?: { name: string } | null;
    };
    quantity: number;
    unitCost: number;
    subtotal: number;
    receivedQty: number;
  }[];
  stats: {
    totalItems: number;
    totalQuantity: number;
    totalReceived: number;
    receivedPercentage: number;
  };
}

interface SupplierDebt {
  id: string;
  supplierId: string;
  supplier: { id: string; name: string; phone?: string | null };
  purchaseOrderId?: string | null;
  purchaseOrder?: { orderNumber: string; total: number } | null;
  amount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string | null;
  status: string;
  isOverdue: boolean;
  daysOverdue: number;
  notes?: string | null;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  category?: { name: string } | null;
  costPrice: number;
  salePrice: number;
  stock: number;
}

export default function ProveedoresPage() {
  const router = useRouter();
  const { isAuthenticated, user, setLoading, setUser } = useAuthStore();

  // Data states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [debtStats, setDebtStats] = useState<{
    totalDebts: number;
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    overdueCount: number;
    overdueAmount: number;
  } | null>(null);

  // Loading states
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [supplierDetailOpen, setSupplierDetailOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Selected items
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDetail | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<SupplierDebt | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    taxId: "",
    paymentTerms: "0",
    notes: "",
  });

  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    expectedDate: "",
    dueDate: "",
    notes: "",
    items: [] as { productId: string; quantity: number; unitCost: number }[],
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    notes: "",
  });

  // Filter states
  const [orderFilters, setOrderFilters] = useState({
    supplierId: "",
    status: "",
    search: "",
  });

  const [supplierSearch, setSupplierSearch] = useState("");

  // New order item form
  const [newItem, setNewItem] = useState({
    productId: "",
    quantity: "1",
    unitCost: "0",
  });

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const result = await response.json();
        if (!result.success || !result.data?.user) {
          router.push("/login");
          return;
        }
        setUser(result.data.user);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router, setLoading, setUser]);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (supplierSearch) params.append("search", supplierSearch);
      params.append("includeInactive", "true");

      const response = await fetch(`/api/suppliers?${params}`);
      const result = await response.json();
      if (result.success) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [supplierSearch]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const params = new URLSearchParams();
      if (orderFilters.supplierId) params.append("supplierId", orderFilters.supplierId);
      if (orderFilters.status) params.append("status", orderFilters.status);
      if (orderFilters.search) params.append("search", orderFilters.search);
      params.append("limit", "50");

      const response = await fetch(`/api/purchase-orders?${params}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  }, [orderFilters]);

  // Fetch debts
  const fetchDebts = useCallback(async () => {
    setLoadingDebts(true);
    try {
      const response = await fetch("/api/supplier-debts?limit=50");
      const result = await response.json();
      if (result.success) {
        setDebts(result.data);
        setDebtStats(result.meta?.stats || null);
      }
    } catch (error) {
      console.error("Error fetching debts:", error);
    } finally {
      setLoadingDebts(false);
    }
  }, []);

  // Fetch products for order creation
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products?limit=200");
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSuppliers();
      fetchOrders();
      fetchDebts();
      fetchProducts();
    }
  }, [isAuthenticated, fetchSuppliers, fetchOrders, fetchDebts, fetchProducts]);

  // Supplier handlers
  const handleOpenSupplierDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({
        name: supplier.name,
        contactName: supplier.contactName || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        taxId: supplier.taxId || "",
        paymentTerms: String(supplier.paymentTerms || 0),
        notes: supplier.notes || "",
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
        taxId: "",
        paymentTerms: "0",
        notes: "",
      });
    }
    setSupplierDialogOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier.id}`
        : "/api/suppliers";
      const method = editingSupplier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...supplierForm,
          paymentTerms: parseInt(supplierForm.paymentTerms) || 0,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          editingSupplier ? "Proveedor actualizado" : "Proveedor creado"
        );
        fetchSuppliers();
        setSupplierDialogOpen(false);
      } else {
        toast.error(result.error || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleViewSupplier = async (supplier: Supplier) => {
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedSupplier(result.data);
        setSupplierDetailOpen(true);
      }
    } catch {
      toast.error("Error al cargar detalles");
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/suppliers/${deletingSupplier.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("Proveedor eliminado");
        fetchSuppliers();
        setDeleteConfirmOpen(false);
        setDeletingSupplier(null);
      } else {
        toast.error(result.error || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // Order handlers
  const handleOpenOrderDialog = () => {
    setOrderForm({
      supplierId: "",
      expectedDate: "",
      dueDate: "",
      notes: "",
      items: [],
    });
    setOrderDialogOpen(true);
  };

  const handleAddOrderItem = () => {
    if (!newItem.productId || !newItem.quantity || !newItem.unitCost) {
      toast.error("Complete todos los campos del producto");
      return;
    }

    const existing = orderForm.items.find((i) => i.productId === newItem.productId);
    if (existing) {
      toast.error("El producto ya fue agregado");
      return;
    }

    setOrderForm({
      ...orderForm,
      items: [
        ...orderForm.items,
        {
          productId: newItem.productId,
          quantity: parseInt(newItem.quantity) || 1,
          unitCost: parseFloat(newItem.unitCost) || 0,
        },
      ],
    });

    setNewItem({ productId: "", quantity: "1", unitCost: "0" });
  };

  const handleRemoveOrderItem = (productId: string) => {
    setOrderForm({
      ...orderForm,
      items: orderForm.items.filter((i) => i.productId !== productId),
    });
  };

  const handleCreateOrder = async () => {
    if (!orderForm.supplierId) {
      toast.error("Seleccione un proveedor");
      return;
    }

    if (orderForm.items.length === 0) {
      toast.error("Agregue al menos un producto");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderForm),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Orden de compra creada");
        fetchOrders();
        fetchDebts();
        setOrderDialogOpen(false);
      } else {
        toast.error(result.error || "Error al crear orden");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleViewOrder = async (order: PurchaseOrder) => {
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedOrder(result.data);
        setOrderDetailOpen(true);
      }
    } catch {
      toast.error("Error al cargar detalles");
    }
  };

  const handleReceiveProducts = async (items: { itemId: string; receivedQty: number }[]) => {
    if (!selectedOrder) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/purchase-orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Productos recibidos");
        fetchOrders();
        // Refresh order detail
        const detailResponse = await fetch(`/api/purchase-orders/${selectedOrder.id}`);
        const detailResult = await detailResponse.json();
        if (detailResult.success) {
          setSelectedOrder(detailResult.data);
        }
      } else {
        toast.error(result.error || "Error al recibir productos");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // Payment handlers
  const handleOpenPaymentDialog = (debt: SupplierDebt) => {
    setSelectedDebt(debt);
    setPaymentForm({
      amount: String(debt.pendingAmount),
      notes: "",
    });
    setPaymentDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedDebt) return;

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    if (amount > selectedDebt.pendingAmount) {
      toast.error("El monto excede el saldo pendiente");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/supplier-debts/${selectedDebt.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          notes: paymentForm.notes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Pago registrado");
        fetchDebts();
        fetchSuppliers();
        setPaymentDialogOpen(false);
      } else {
        toast.error(result.error || "Error al registrar pago");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  // Calculate order total
  const calculateOrderTotal = () => {
    const subtotal = orderForm.items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );
    const tax = subtotal * 0.19;
    return { subtotal, tax, total: subtotal + tax };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Proveedores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-emerald-500" />
              Gestión de Proveedores
            </h2>
            <p className="text-gray-500">
              Administra proveedores, órdenes de compra y deudas
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="suppliers" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <TruckIcon className="w-4 h-4" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Órdenes de Compra
            </TabsTrigger>
            <TabsTrigger value="debts" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Deudas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Proveedores */}
          <TabsContent value="suppliers" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Proveedores</p>
                  <p className="text-2xl font-bold">{suppliers.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Activos</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {suppliers.filter((s) => s.isActive).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Con Órdenes</p>
                  <p className="text-2xl font-bold">
                    {suppliers.filter((s) => (s.ordersCount || 0) > 0).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Deuda Total</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      suppliers.reduce((sum, s) => sum + (s.totalDebt || 0), 0)
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar proveedores..."
                  className="pl-9"
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                />
              </div>
              {user?.role === "ADMIN" && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleOpenSupplierDialog()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Proveedor
                </Button>
              )}
            </div>

            {/* Suppliers Table */}
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-26rem)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Deuda Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingSuppliers ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                          </TableCell>
                        </TableRow>
                      ) : suppliers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No hay proveedores registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        suppliers.map((supplier) => (
                          <TableRow key={supplier.id}>
                            <TableCell className="font-medium">
                              <div>
                                {supplier.name}
                                {supplier.taxId && (
                                  <p className="text-xs text-gray-500">NIT: {supplier.taxId}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{supplier.contactName || "-"}</TableCell>
                            <TableCell>{supplier.phone || "-"}</TableCell>
                            <TableCell>
                              <span className={supplier.totalDebt > 0 ? "text-red-600 font-semibold" : ""}>
                                {formatCurrency(supplier.totalDebt || 0)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  supplier.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {supplier.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewSupplier(supplier)}
                                  title="Ver detalle"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {user?.role === "ADMIN" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenSupplierDialog(supplier)}
                                      title="Editar"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setDeletingSupplier(supplier);
                                        setDeleteConfirmOpen(true);
                                      }}
                                      title="Eliminar"
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Órdenes de Compra */}
          <TabsContent value="orders" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500">Proveedor</Label>
                    <Select
                      value={orderFilters.supplierId}
                      onValueChange={(v) =>
                        setOrderFilters({ ...orderFilters, supplierId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los proveedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los proveedores</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500">Estado</Label>
                    <Select
                      value={orderFilters.status}
                      onValueChange={(v) =>
                        setOrderFilters({ ...orderFilters, status: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos los estados</SelectItem>
                        <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                        <SelectItem value="ENVIADO">Enviado</SelectItem>
                        <SelectItem value="RECIBIDO_PARCIAL">Recibido Parcial</SelectItem>
                        <SelectItem value="RECIBIDO_COMPLETO">Recibido</SelectItem>
                        <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500">Buscar</Label>
                    <Input
                      placeholder="Número de orden..."
                      value={orderFilters.search}
                      onChange={(e) =>
                        setOrderFilters({ ...orderFilters, search: e.target.value })
                      }
                    />
                  </div>
                  {user?.role === "ADMIN" && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleOpenOrderDialog}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Orden
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-22rem)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingOrders ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                          </TableCell>
                        </TableRow>
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No hay órdenes de compra
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>{order.supplier.name}</TableCell>
                            <TableCell>{formatDate(order.orderDate)}</TableCell>
                            <TableCell>{formatCurrency(order.total)}</TableCell>
                            <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                            <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewOrder(order)}
                                title="Ver detalle"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Deudas */}
          <TabsContent value="debts" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <p className="text-sm text-gray-500">Total Deudas</p>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(debtStats?.totalPending || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-600">Vencidas</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(debtStats?.overdueAmount || 0)}
                  </p>
                  <p className="text-xs text-red-500">
                    {debtStats?.overdueCount || 0} deudas
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-sm text-gray-500">Pagado</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(debtStats?.totalPaid || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <p className="text-sm text-gray-500">Por Vencer</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      (debtStats?.totalPending || 0) - (debtStats?.overdueAmount || 0)
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Debts Table */}
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-22rem)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Orden</TableHead>
                        <TableHead>Monto Original</TableHead>
                        <TableHead>Pagado</TableHead>
                        <TableHead>Pendiente</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDebts ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                          </TableCell>
                        </TableRow>
                      ) : debts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                            No hay deudas pendientes
                          </TableCell>
                        </TableRow>
                      ) : (
                        debts.map((debt) => (
                          <TableRow
                            key={debt.id}
                            className={debt.isOverdue ? "bg-red-50" : ""}
                          >
                            <TableCell className="font-medium">
                              {debt.supplier.name}
                            </TableCell>
                            <TableCell>
                              {debt.purchaseOrder?.orderNumber || "-"}
                            </TableCell>
                            <TableCell>{formatCurrency(debt.amount)}</TableCell>
                            <TableCell className="text-green-600">
                              {formatCurrency(debt.paidAmount)}
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              {formatCurrency(debt.pendingAmount)}
                            </TableCell>
                            <TableCell>
                              <div>
                                {formatDate(debt.dueDate)}
                                {debt.isOverdue && (
                                  <p className="text-xs text-red-500">
                                    {debt.daysOverdue} días vencido
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getDebtStatusBadge(debt.status, debt.isOverdue)}
                            </TableCell>
                            <TableCell className="text-right">
                              {user?.role === "ADMIN" && debt.status !== "PAGADO" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPaymentDialog(debt)}
                                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                >
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  Pagar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={supplierForm.name}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, name: e.target.value })
                  }
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label>NIT/RUT</Label>
                <Input
                  value={supplierForm.taxId}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, taxId: e.target.value })
                  }
                  placeholder="900123456-7"
                />
              </div>

              <div className="space-y-2">
                <Label>Días de Crédito</Label>
                <Input
                  type="number"
                  value={supplierForm.paymentTerms}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Contacto</Label>
                <Input
                  value={supplierForm.contactName}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, contactName: e.target.value })
                  }
                  placeholder="Nombre del contacto"
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                  placeholder="+57 300..."
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={supplierForm.address}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, address: e.target.value })
                  }
                  placeholder="Dirección"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={supplierForm.notes}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, notes: e.target.value })
                  }
                  placeholder="Notas adicionales"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSupplierDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSaveSupplier}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Guardar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Detail Dialog */}
      <Dialog open={supplierDetailOpen} onOpenChange={setSupplierDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-emerald-500" />
              {selectedSupplier?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedSupplier && (
            <ScrollArea className="max-h-[calc(90vh-8rem)]">
              <div className="space-y-4 pr-4">
                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Información de Contacto</h4>
                      <div className="space-y-1 text-sm">
                        {selectedSupplier.contactName && (
                          <p>Contacto: {selectedSupplier.contactName}</p>
                        )}
                        {selectedSupplier.phone && (
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {selectedSupplier.phone}
                          </p>
                        )}
                        {selectedSupplier.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {selectedSupplier.email}
                          </p>
                        )}
                        {selectedSupplier.address && (
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {selectedSupplier.address}
                          </p>
                        )}
                        {selectedSupplier.taxId && (
                          <p>NIT: {selectedSupplier.taxId}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">Estadísticas</h4>
                      <div className="space-y-1 text-sm">
                        <p>Total Órdenes: {selectedSupplier.stats.totalOrders}</p>
                        <p>Total Comprado: {formatCurrency(selectedSupplier.stats.totalPurchased)}</p>
                        <p>Total Pagado: {formatCurrency(selectedSupplier.stats.totalPaid)}</p>
                        <p className="font-semibold text-red-600">
                          Deuda Actual: {formatCurrency(selectedSupplier.stats.totalDebt)}
                        </p>
                        {selectedSupplier.stats.overdueDebts > 0 && (
                          <p className="text-red-500">
                            Deudas Vencidas: {selectedSupplier.stats.overdueDebts} (
                            {formatCurrency(selectedSupplier.stats.overdueAmount)})
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                {selectedSupplier.recentOrders.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Órdenes Recientes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSupplier.recentOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">
                                {order.orderNumber}
                              </TableCell>
                              <TableCell>{formatDate(order.orderDate)}</TableCell>
                              <TableCell>{formatCurrency(order.total)}</TableCell>
                              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Pending Debts */}
                {selectedSupplier.pendingDebts.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-red-600">
                        Deudas Pendientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Monto</TableHead>
                            <TableHead>Pagado</TableHead>
                            <TableHead>Pendiente</TableHead>
                            <TableHead>Vencimiento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSupplier.pendingDebts.map((debt) => (
                            <TableRow key={debt.id}>
                              <TableCell>{formatCurrency(debt.amount)}</TableCell>
                              <TableCell className="text-green-600">
                                {formatCurrency(debt.paidAmount)}
                              </TableCell>
                              <TableCell className="text-red-600 font-semibold">
                                {formatCurrency(debt.pendingAmount)}
                              </TableCell>
                              <TableCell>
                                {formatDate(debt.dueDate)}
                                {debt.dueDate && new Date(debt.dueDate) < new Date() && (
                                  <Badge variant="outline" className="ml-2 bg-red-100 text-red-800">
                                    Vencida
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* New Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Compra</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            <div className="space-y-4 pr-4">
              {/* Order Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select
                    value={orderForm.supplierId}
                    onValueChange={(v) =>
                      setOrderForm({ ...orderForm, supplierId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Esperada</Label>
                  <Input
                    type="date"
                    value={orderForm.expectedDate}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, expectedDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha Vencimiento Pago</Label>
                  <Input
                    type="date"
                    value={orderForm.dueDate}
                    onChange={(e) =>
                      setOrderForm({ ...orderForm, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Add Items */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agregar Productos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-2">
                      <Select
                        value={newItem.productId}
                        onValueChange={(v) => {
                          setNewItem({ ...newItem, productId: v });
                          const prod = products.find((p) => p.id === v);
                          if (prod) {
                            setNewItem({
                              ...newItem,
                              productId: v,
                              unitCost: String(prod.costPrice),
                            });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (Stock: {p.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      placeholder="Cantidad"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Costo"
                        value={newItem.unitCost}
                        onChange={(e) =>
                          setNewItem({ ...newItem, unitCost: e.target.value })
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleAddOrderItem}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Items List */}
                  {orderForm.items.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Costo Unit.</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderForm.items.map((item) => {
                          const product = products.find((p) => p.id === item.productId);
                          return (
                            <TableRow key={item.productId}>
                              <TableCell>{product?.name || item.productId}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                              <TableCell>
                                {formatCurrency(item.quantity * item.unitCost)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveOrderItem(item.productId)}
                                  className="text-red-500"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Totals */}
              {orderForm.items.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Subtotal: {formatCurrency(calculateOrderTotal().subtotal)}
                        <span className="mx-2">|</span>
                        IVA (19%): {formatCurrency(calculateOrderTotal().tax)}
                      </div>
                      <div className="text-xl font-bold">
                        Total: {formatCurrency(calculateOrderTotal().total)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={orderForm.notes}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, notes: e.target.value })
                  }
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOrderDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleCreateOrder}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Crear Orden"
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-500" />
              {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <ScrollArea className="max-h-[calc(90vh-8rem)]">
              <div className="space-y-4 pr-4">
                {/* Order Info */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Proveedor</p>
                      <p className="font-medium">{selectedOrder.supplier.name}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Estado</p>
                      {getOrderStatusBadge(selectedOrder.status)}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-bold text-lg">{formatCurrency(selectedOrder.total)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Fecha Orden:</span>{" "}
                    {formatDate(selectedOrder.orderDate)}
                  </div>
                  <div>
                    <span className="text-gray-500">Fecha Esperada:</span>{" "}
                    {formatDate(selectedOrder.expectedDate)}
                  </div>
                  <div>
                    <span className="text-gray-500">Vencimiento Pago:</span>{" "}
                    {formatDate(selectedOrder.dueDate)}
                  </div>
                </div>

                {/* Reception Stats */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">Progreso de Recepción</span>
                      <span className="text-sm font-medium">
                        {selectedOrder.stats.receivedPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${selectedOrder.stats.receivedPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Recibido: {selectedOrder.stats.totalReceived}</span>
                      <span>Esperado: {selectedOrder.stats.totalQuantity}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Productos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Costo</TableHead>
                          <TableHead>Recibido</TableHead>
                          <TableHead>Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                {item.product.name}
                                {item.product.category && (
                                  <p className="text-xs text-gray-500">
                                    {item.product.category.name}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.receivedQty >= item.quantity
                                    ? "bg-green-100 text-green-800"
                                    : item.receivedQty > 0
                                    ? "bg-yellow-100 text-yellow-800"
                                    : ""
                                }
                              >
                                {item.receivedQty}/{item.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Receive Products (Admin only, for pending/partial orders) */}
                {user?.role === "ADMIN" &&
                  selectedOrder.status !== "CANCELADO" &&
                  selectedOrder.status !== "RECIBIDO_COMPLETO" && (
                    <Card className="border-emerald-200 bg-emerald-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-emerald-700">
                          Recibir Productos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ReceiveProductsForm
                          items={selectedOrder.items}
                          onReceive={handleReceiveProducts}
                          saving={saving}
                        />
                      </CardContent>
                    </Card>
                  )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>

          {selectedDebt && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Proveedor:</span>{" "}
                      {selectedDebt.supplier.name}
                    </p>
                    {selectedDebt.purchaseOrder && (
                      <p>
                        <span className="text-gray-500">Orden:</span>{" "}
                        {selectedDebt.purchaseOrder.orderNumber}
                      </p>
                    )}
                    <p>
                      <span className="text-gray-500">Monto Original:</span>{" "}
                      {formatCurrency(selectedDebt.amount)}
                    </p>
                    <p>
                      <span className="text-gray-500">Pagado:</span>{" "}
                      <span className="text-green-600">
                        {formatCurrency(selectedDebt.paidAmount)}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">Pendiente:</span>{" "}
                      <span className="text-red-600 font-bold">
                        {formatCurrency(selectedDebt.pendingAmount)}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Monto a Pagar</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder="0"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: String(selectedDebt.pendingAmount),
                      })
                    }
                  >
                    Pago Total
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: String(Math.round(selectedDebt.pendingAmount / 2)),
                      })
                    }
                  >
                    50%
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  placeholder="Referencia o nota del pago"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleRegisterPayment}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Registrar Pago"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar a <strong>{deletingSupplier?.name}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

// Receive Products Form Component
function ReceiveProductsForm({
  items,
  onReceive,
  saving,
}: {
  items: {
    id: string;
    productId: string;
    product: { name: string };
    quantity: number;
    receivedQty: number;
  }[];
  onReceive: (items: { itemId: string; receivedQty: number }[]) => void;
  saving: boolean;
}) {
  const [receiveItems, setReceiveItems] = useState<
    Record<string, number>
  >({});

  const pendingItems = items.filter((item) => item.receivedQty < item.quantity);

  const handleSubmit = () => {
    const itemsToReceive = Object.entries(receiveItems)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, receivedQty: qty }));

    if (itemsToReceive.length === 0) {
      toast.error("Seleccione productos para recibir");
      return;
    }

    onReceive(itemsToReceive);
  };

  if (pendingItems.length === 0) {
    return <p className="text-sm text-gray-500">Todos los productos recibidos</p>;
  }

  return (
    <div className="space-y-3">
      {pendingItems.map((item) => {
        const pending = item.quantity - item.receivedQty;
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{item.product.name}</p>
              <p className="text-xs text-gray-500">
                Pendiente: {pending} de {item.quantity}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="w-20"
                min={0}
                max={pending}
                value={receiveItems[item.id] || ""}
                onChange={(e) =>
                  setReceiveItems({
                    ...receiveItems,
                    [item.id]: Math.min(pending, parseInt(e.target.value) || 0),
                  })
                }
                placeholder="0"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setReceiveItems({
                    ...receiveItems,
                    [item.id]: pending,
                  })
                }
              >
                Todo
              </Button>
            </div>
          </div>
        );
      })}

      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Package className="w-4 h-4 mr-2" />
            Recibir Productos
          </>
        )}
      </Button>
    </div>
  );
}
