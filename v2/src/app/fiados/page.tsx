"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  CreditCard,
  DollarSign,
  Plus,
  Loader2,
  Edit2,
  Search,
  Eye,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store";
import { toast } from "sonner";

// Types
interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
  salesCount: number;
  paymentsCount: number;
  totalCredit: number;
  totalPayments: number;
  pendingBalance: number;
  availableCredit: number;
}

interface CreditSale {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    creditLimit: number;
  } | null;
  total: number;
  paidAmount: number;
  pendingAmount: number;
  creditStatus: "PENDIENTE" | "PAGADO" | "VENCIDO";
  createdAt: string;
  creditDueDate?: string | null;
  paymentStatus: string;
  notes?: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

interface PaymentRecord {
  id: string;
  customerId: string;
  saleId: string;
  amount: number;
  paymentMethod: string;
  notes?: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
  };
  sale: {
    id: string;
    invoiceNumber: string;
    total: number;
    createdAt: string;
  };
}

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
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Payment method labels
const paymentMethodLabels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

// Status badge component
const StatusBadge = ({ status }: { status: "PENDIENTE" | "PAGADO" | "VENCIDO" }) => {
  const config = {
    PENDIENTE: { label: "Pendiente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    PAGADO: { label: "Pagado", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    VENCIDO: { label: "Vencido", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  };
  const { label, className } = config[status];
  return <Badge className={className}>{label}</Badge>;
};

export default function FiadosPage() {
  const router = useRouter();
  const { isAuthenticated, user, setLoading, setUser } = useAuthStore();

  // States
  const [loading, setLoading2] = useState(true);
  const [activeTab, setActiveTab] = useState("clientes");

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    creditLimit: 0,
  });

  // Credits
  const [credits, setCredits] = useState<CreditSale[]>([]);
  const [creditStatusFilter, setCreditStatusFilter] = useState<string>("all");
  const [creditCustomerFilter, setCreditCustomerFilter] = useState<string>("all");

  // Payments
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentDateFilter, setPaymentDateFilter] = useState("");
  const [paymentCustomerFilter, setPaymentCustomerFilter] = useState<string>("all");

  // Payment Dialog
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    customerId: "",
    saleId: "",
    amount: 0,
    paymentMethod: "EFECTIVO" as string,
    notes: "",
  });
  const [customerCredits, setCustomerCredits] = useState<CreditSale[]>([]);
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);

  // Customer detail dialog
  const [showCustomerDetailDialog, setShowCustomerDetailDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Credit detail dialog
  const [showCreditDetailDialog, setShowCreditDetailDialog] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditSale | null>(null);

  // Check auth
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

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (customerSearch) params.set("search", customerSearch);
      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, [customerSearch]);

  // Fetch credits
  const fetchCredits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (creditStatusFilter !== "all") params.set("status", creditStatusFilter);
      if (creditCustomerFilter !== "all") params.set("customerId", creditCustomerFilter);
      const response = await fetch(`/api/credits?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setCredits(result.data);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    }
  }, [creditStatusFilter, creditCustomerFilter]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (paymentCustomerFilter !== "all") params.set("customerId", paymentCustomerFilter);
      const response = await fetch(`/api/credits/payments?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setPayments(result.data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    }
  }, [paymentCustomerFilter]);

  // Load data on auth
  useEffect(() => {
    if (isAuthenticated) {
      setLoading2(true);
      Promise.all([fetchCustomers(), fetchCredits(), fetchPayments()]).finally(() =>
        setLoading2(false)
      );
    }
  }, [isAuthenticated, fetchCustomers, fetchCredits, fetchPayments]);

  // Refresh on search/filter change
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    }
  }, [customerSearch, isAuthenticated, fetchCustomers]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCredits();
    }
  }, [creditStatusFilter, creditCustomerFilter, isAuthenticated, fetchCredits]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayments();
    }
  }, [paymentCustomerFilter, isAuthenticated, fetchPayments]);

  // Customer dialog handlers
  const handleOpenCustomerDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "",
        creditLimit: customer.creditLimit,
      });
    } else {
      setEditingCustomer(null);
      setCustomerFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
        creditLimit: 0,
      });
    }
    setShowCustomerDialog(true);
  };

  const handleSaveCustomer = async () => {
    if (!customerFormData.name) {
      toast.error("El nombre es requerido");
      return;
    }

    setSavingCustomer(true);

    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerFormData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingCustomer ? "Cliente actualizado" : "Cliente creado");
        fetchCustomers();
        setShowCustomerDialog(false);
      } else {
        toast.error(result.error || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingCustomer(false);
    }
  };

  // Payment dialog handlers
  const handleOpenPaymentDialog = (customer?: Customer, sale?: CreditSale) => {
    if (customer) {
      setPaymentFormData({
        customerId: customer.id,
        saleId: "",
        amount: 0,
        paymentMethod: "EFECTIVO",
        notes: "",
      });
      loadCustomerCredits(customer.id);
    } else if (sale && sale.customer) {
      setPaymentFormData({
        customerId: sale.customer.id,
        saleId: sale.id,
        amount: sale.pendingAmount,
        paymentMethod: "EFECTIVO",
        notes: "",
      });
      setSelectedSale(sale);
      loadCustomerCredits(sale.customer.id);
    } else {
      setPaymentFormData({
        customerId: "",
        saleId: "",
        amount: 0,
        paymentMethod: "EFECTIVO",
        notes: "",
      });
      setCustomerCredits([]);
    }
    setShowPaymentDialog(true);
  };

  const loadCustomerCredits = async (customerId: string) => {
    try {
      const response = await fetch(`/api/credits?customerId=${customerId}&status=pendiente`);
      const result = await response.json();
      if (result.success) {
        setCustomerCredits(result.data);
      }
    } catch (error) {
      console.error("Error loading customer credits:", error);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    setPaymentFormData({ ...paymentFormData, customerId, saleId: "", amount: 0 });
    setSelectedSale(null);
    if (customerId) {
      loadCustomerCredits(customerId);
    } else {
      setCustomerCredits([]);
    }
  };

  const handleSaleSelect = (saleId: string) => {
    const sale = customerCredits.find((c) => c.id === saleId);
    if (sale) {
      setSelectedSale(sale);
      setPaymentFormData({ ...paymentFormData, saleId, amount: sale.pendingAmount });
    } else {
      setSelectedSale(null);
      setPaymentFormData({ ...paymentFormData, saleId: "", amount: 0 });
    }
  };

  const handleSavePayment = async () => {
    if (!paymentFormData.customerId) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!paymentFormData.saleId) {
      toast.error("Selecciona una venta");
      return;
    }
    if (paymentFormData.amount <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setSavingPayment(true);

    try {
      const response = await fetch("/api/credits/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentFormData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Pago registrado correctamente");
        fetchCustomers();
        fetchCredits();
        fetchPayments();
        setShowPaymentDialog(false);
        setPaymentFormData({
          customerId: "",
          saleId: "",
          amount: 0,
          paymentMethod: "EFECTIVO",
          notes: "",
        });
        setSelectedSale(null);
        setCustomerCredits([]);
      } else {
        toast.error(result.error || "Error al registrar pago");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingPayment(false);
    }
  };

  // View customer detail
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetailDialog(true);
  };

  // View credit detail
  const handleViewCredit = (credit: CreditSale) => {
    setSelectedCredit(credit);
    setShowCreditDetailDialog(true);
  };

  // Calculate stats
  const totalInCredits = credits
    .filter((c) => c.creditStatus !== "PAGADO")
    .reduce((sum, c) => sum + c.pendingAmount, 0);
  const totalOverdue = credits
    .filter((c) => c.creditStatus === "VENCIDO")
    .reduce((sum, c) => sum + c.pendingAmount, 0);
  const customersWithCredit = new Set(
    credits.filter((c) => c.creditStatus !== "PAGADO").map((c) => c.customer?.id)
  ).size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Sistema de Fiado">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-emerald-500" />
              Sistema de Fiado
            </h2>
            <p className="text-gray-500">Gestión de créditos y clientes</p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleOpenPaymentDialog()}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Registrar Pago
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="clientes">
              <Users className="w-4 h-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="creditos">
              <CreditCard className="w-4 h-4 mr-2" />
              Créditos
            </TabsTrigger>
            <TabsTrigger value="pagos">
              <DollarSign className="w-4 h-4 mr-2" />
              Pagos
            </TabsTrigger>
          </TabsList>

          {/* Tab Clientes */}
          <TabsContent value="clientes" className="mt-6 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Clientes</p>
                  <p className="text-2xl font-bold">{customers.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Clientes Activos</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {customers.filter((c) => c.isActive).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Con Crédito Pendiente</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {customers.filter((c) => c.pendingBalance > 0).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Sobre Límite</p>
                  <p className="text-2xl font-bold text-red-600">
                    {customers.filter((c) => c.pendingBalance > c.creditLimit && c.creditLimit > 0).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search and actions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Lista de Clientes</CardTitle>
                  {user?.role === "ADMIN" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleOpenCustomerDialog()}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Cliente
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre, teléfono o email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <ScrollArea className="max-h-[calc(100vh-26rem)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="text-right">Límite Crédito</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            No se encontraron clientes
                          </TableCell>
                        </TableRow>
                      ) : (
                        customers.map((customer) => {
                          const isOverLimit = customer.creditLimit > 0 && customer.pendingBalance > customer.creditLimit;
                          return (
                            <TableRow key={customer.id} className={isOverLimit ? "bg-red-50" : ""}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  {customer.email && (
                                    <p className="text-xs text-gray-500">{customer.email}</p>
                                  )}
                                  {isOverLimit && (
                                    <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      Excede límite
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{customer.phone || "-"}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(customer.creditLimit)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className={customer.pendingBalance > 0 ? "text-amber-600 font-semibold" : ""}>
                                  {formatCurrency(customer.pendingBalance)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={customer.isActive ? "default" : "secondary"}>
                                  {customer.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewCustomer(customer)}
                                    title="Ver detalle"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {customer.pendingBalance > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-emerald-600"
                                      onClick={() => handleOpenPaymentDialog(customer)}
                                      title="Registrar pago"
                                    >
                                      <DollarSign className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {user?.role === "ADMIN" && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenCustomerDialog(customer)}
                                      title="Editar"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Créditos */}
          <TabsContent value="creditos" className="mt-6 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total en Créditos</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalInCredits)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Créditos Vencidos</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Clientes con Crédito</p>
                      <p className="text-2xl font-bold">{customersWithCredit}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Ventas a Crédito</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm text-gray-500">Cliente</Label>
                    <Select value={creditCustomerFilter} onValueChange={setCreditCustomerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label className="text-sm text-gray-500">Estado</Label>
                    <Select value={creditStatusFilter} onValueChange={setCreditStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="pagado">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <ScrollArea className="max-h-[calc(100vh-28rem)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>Fecha Venta</TableHead>
                        <TableHead className="text-right">Monto Original</TableHead>
                        <TableHead className="text-right">Abonado</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                            No se encontraron créditos
                          </TableCell>
                        </TableRow>
                      ) : (
                        credits.map((credit) => (
                          <TableRow key={credit.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{credit.customer?.name || "N/A"}</p>
                                {credit.customer?.phone && (
                                  <p className="text-xs text-gray-500">{credit.customer.phone}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{credit.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(credit.createdAt)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(credit.total)}</TableCell>
                            <TableCell className="text-right text-emerald-600">
                              {formatCurrency(credit.paidAmount)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(credit.pendingAmount)}
                            </TableCell>
                            <TableCell>
                              {credit.creditDueDate ? (
                                <span className={credit.creditStatus === "VENCIDO" ? "text-red-600" : ""}>
                                  {formatDate(credit.creditDueDate)}
                                </span>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={credit.creditStatus} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewCredit(credit)}
                                  title="Ver detalle"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {credit.creditStatus !== "PAGADO" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-emerald-600"
                                    onClick={() => handleOpenPaymentDialog(undefined, credit)}
                                    title="Registrar pago"
                                  >
                                    <DollarSign className="w-4 h-4" />
                                  </Button>
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

          {/* Tab Pagos */}
          <TabsContent value="pagos" className="mt-6 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Abonos Recibidos</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Abonos</p>
                      <p className="text-2xl font-bold">{payments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Historial de Abonos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-sm text-gray-500">Cliente</Label>
                    <Select value={paymentCustomerFilter} onValueChange={setPaymentCustomerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los clientes</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label className="text-sm text-gray-500">Fecha</Label>
                    <Input
                      type="date"
                      value={paymentDateFilter}
                      onChange={(e) => setPaymentDateFilter(e.target.value)}
                    />
                  </div>
                </div>

                <ScrollArea className="max-h-[calc(100vh-28rem)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Método de Pago</TableHead>
                        <TableHead>Venta Relacionada</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            No se encontraron pagos
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments
                          .filter((p) => !paymentDateFilter || p.createdAt.startsWith(paymentDateFilter))
                          .map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>
                                <div>
                                  <p>{formatDate(payment.createdAt)}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(payment.createdAt).toLocaleTimeString("es-CO", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{payment.customer.name}</p>
                                  {payment.customer.phone && (
                                    <p className="text-xs text-gray-500">{payment.customer.phone}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{paymentMethodLabels[payment.paymentMethod]}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">{payment.sale.invoiceNumber}</span>
                              </TableCell>
                              <TableCell className="text-gray-500 text-sm">
                                {payment.notes || "-"}
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

      {/* Customer Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={customerFormData.name}
                onChange={(e) =>
                  setCustomerFormData({ ...customerFormData, name: e.target.value })
                }
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={customerFormData.phone}
                  onChange={(e) =>
                    setCustomerFormData({ ...customerFormData, phone: e.target.value })
                  }
                  placeholder="+57 300..."
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={customerFormData.email}
                  onChange={(e) =>
                    setCustomerFormData({ ...customerFormData, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={customerFormData.address}
                onChange={(e) =>
                  setCustomerFormData({ ...customerFormData, address: e.target.value })
                }
                placeholder="Dirección"
              />
            </div>

            <div className="space-y-2">
              <Label>Límite de Crédito</Label>
              <Input
                type="number"
                value={customerFormData.creditLimit}
                onChange={(e) =>
                  setCustomerFormData({
                    ...customerFormData,
                    creditLimit: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={customerFormData.notes}
                onChange={(e) =>
                  setCustomerFormData({ ...customerFormData, notes: e.target.value })
                }
                placeholder="Notas adicionales"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCustomerDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSaveCustomer}
                disabled={savingCustomer}
              >
                {savingCustomer ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Guardar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Pago de Crédito</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={paymentFormData.customerId}
                onValueChange={handleCustomerSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers
                    .filter((c) => c.pendingBalance > 0)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - Saldo: {formatCurrency(c.pendingBalance)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {paymentFormData.customerId && customerCredits.length > 0 && (
              <div className="space-y-2">
                <Label>Venta a Abonar</Label>
                <Select
                  value={paymentFormData.saleId}
                  onValueChange={handleSaleSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar venta" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerCredits.map((credit) => (
                      <SelectItem key={credit.id} value={credit.id}>
                        {credit.invoiceNumber} - Saldo: {formatCurrency(credit.pendingAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedSale && (
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Factura</p>
                      <p className="font-medium">{selectedSale.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fecha</p>
                      <p>{formatDate(selectedSale.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Monto Original</p>
                      <p>{formatCurrency(selectedSale.total)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Abonado</p>
                      <p className="text-emerald-600">{formatCurrency(selectedSale.paidAmount)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Saldo Pendiente</p>
                      <p className="text-lg font-bold text-amber-600">
                        {formatCurrency(selectedSale.pendingAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto del Abono</Label>
                <Input
                  type="number"
                  value={paymentFormData.amount}
                  onChange={(e) =>
                    setPaymentFormData({
                      ...paymentFormData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select
                  value={paymentFormData.paymentMethod}
                  onValueChange={(v) =>
                    setPaymentFormData({ ...paymentFormData, paymentMethod: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="NEQUI">Nequi</SelectItem>
                    <SelectItem value="DAVIPLATA">Daviplata</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={paymentFormData.notes}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                }
                placeholder="Notas adicionales"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSavePayment}
                disabled={savingPayment}
              >
                {savingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Registrar Pago"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={showCustomerDetailDialog} onOpenChange={setShowCustomerDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Cliente</DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                  <Badge variant={selectedCustomer.isActive ? "default" : "secondary"}>
                    {selectedCustomer.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                )}
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="col-span-2 flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                )}
              </div>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Límite de Crédito</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(selectedCustomer.creditLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Saldo Pendiente</p>
                      <p
                        className={`text-lg font-semibold ${
                          selectedCustomer.pendingBalance > selectedCustomer.creditLimit &&
                          selectedCustomer.creditLimit > 0
                            ? "text-red-600"
                            : "text-amber-600"
                        }`}
                      >
                        {formatCurrency(selectedCustomer.pendingBalance)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Ventas</p>
                      <p className="font-medium">{selectedCustomer.salesCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Pagos</p>
                      <p className="font-medium">{selectedCustomer.paymentsCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedCustomer.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notas</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedCustomer.notes}</p>
                </div>
              )}

              {selectedCustomer.pendingBalance > 0 && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setShowCustomerDetailDialog(false);
                    handleOpenPaymentDialog(selectedCustomer);
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Registrar Pago
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Credit Detail Dialog */}
      <Dialog open={showCreditDetailDialog} onOpenChange={setShowCreditDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Crédito</DialogTitle>
          </DialogHeader>

          {selectedCredit && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-lg">{selectedCredit.invoiceNumber}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedCredit.createdAt)}
                  </p>
                </div>
                <StatusBadge status={selectedCredit.creditStatus} />
              </div>

              {selectedCredit.customer && (
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{selectedCredit.customer.name}</p>
                    {selectedCredit.customer.phone && (
                      <p className="text-sm text-gray-500">{selectedCredit.customer.phone}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Monto Original</p>
                  <p className="font-semibold">{formatCurrency(selectedCredit.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Abonado</p>
                  <p className="font-semibold text-emerald-600">
                    {formatCurrency(selectedCredit.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pendiente</p>
                  <p className="font-semibold text-amber-600">
                    {formatCurrency(selectedCredit.pendingAmount)}
                  </p>
                </div>
              </div>

              {selectedCredit.creditDueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    Vence: {formatDate(selectedCredit.creditDueDate)}
                    {selectedCredit.creditStatus === "VENCIDO" && (
                      <span className="text-red-600 ml-2">(Vencido)</span>
                    )}
                  </span>
                </div>
              )}

              {selectedCredit.items && selectedCredit.items.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Productos</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {selectedCredit.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCredit.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notas</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedCredit.notes}</p>
                </div>
              )}

              {selectedCredit.creditStatus !== "PAGADO" && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setShowCreditDetailDialog(false);
                    handleOpenPaymentDialog(undefined, selectedCredit);
                  }}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Registrar Pago
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
