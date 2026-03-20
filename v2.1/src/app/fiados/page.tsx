"use client";

import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// Formateador de moneda COP
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Formateador de fecha
const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

// Tipos
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  creditLimit: number;
  isActive: boolean;
  createdAt: string;
  pendingBalance: number;
  creditAvailable: number;
  isOverLimit: boolean;
}

interface Credit {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  total: number;
  paidAmount: number;
  pendingAmount: number;
  createdAt: string;
  creditDueDate: string | null;
  status: string;
  items?: Array<{
    quantity: number;
    product: { name: string };
  }>;
}

interface CreditPayment {
  id: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
  sale: {
    invoiceNumber: string;
    total: number;
  };
}

export default function FiadosPage() {
  // Estados
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("clientes");

  // Clientes
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [searchCustomer, setSearchCustomer] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);

  // Créditos
  const [credits, setCredits] = useState<Credit[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditStatus, setCreditStatus] = useState("all");
  const [creditCustomerFilter, setCreditCustomerFilter] = useState("");

  // Pagos
  const [payments, setPayments] = useState<CreditPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentCustomerFilter, setPaymentCustomerFilter] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);

  // Modales
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditDetail, setShowCreditDetail] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);

  // Formulario cliente
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    creditLimit: "0",
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Formulario pago
  const [paymentForm, setPaymentForm] = useState({
    saleId: "",
    customerId: "",
    amount: "",
    paymentMethod: "EFECTIVO",
    notes: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Estadísticas
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    withCredit: 0,
    overLimit: 0,
    totalCredits: 0,
    totalCreditsAmount: 0,
    overdueCount: 0,
  });

  // Cargar clientes
  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", customerPage.toString());
      params.append("limit", "10");
      if (searchCustomer) {
        params.append("search", searchCustomer);
      }

      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
        setCustomerTotalPages(result.pagination.totalPages);
      }
    } catch {
      toast.error("Error al cargar clientes");
    } finally {
      setCustomersLoading(false);
    }
  }, [customerPage, searchCustomer]);

  // Cargar créditos
  const loadCredits = useCallback(async () => {
    setCreditsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("status", creditStatus);
      if (creditCustomerFilter) {
        params.append("customerId", creditCustomerFilter);
      }

      const response = await fetch(`/api/credits?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setCredits(result.data);
        setStats((prev) => ({
          ...prev,
          totalCredits: result.stats.totalCredits,
          totalCreditsAmount: result.stats.totalAmount,
          overdueCount: result.stats.overdueCount,
        }));
      }
    } catch {
      toast.error("Error al cargar créditos");
    } finally {
      setCreditsLoading(false);
    }
  }, [creditStatus, creditCustomerFilter]);

  // Cargar pagos
  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", paymentPage.toString());
      params.append("limit", "10");
      if (paymentCustomerFilter) {
        params.append("customerId", paymentCustomerFilter);
      }

      const response = await fetch(`/api/credits/payments?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setPayments(result.data);
        setPaymentTotalPages(result.pagination.totalPages);
      }
    } catch {
      toast.error("Error al cargar pagos");
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentPage, paymentCustomerFilter]);

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      const [customersRes, creditsRes] = await Promise.all([
        fetch("/api/customers?limit=100"),
        fetch("/api/credits?status=all"),
      ]);

      const [customersData, creditsData] = await Promise.all([
        customersRes.json(),
        creditsRes.json(),
      ]);

      if (customersData.success) {
        const allCustomers = customersData.data;
        setStats((prev) => ({
          ...prev,
          totalCustomers: customersData.pagination.total,
          activeCustomers: allCustomers.filter((c: Customer) => c.isActive).length,
          withCredit: allCustomers.filter((c: Customer) => c.pendingBalance > 0).length,
          overLimit: allCustomers.filter((c: Customer) => c.isOverLimit).length,
        }));
      }

      if (creditsData.success) {
        setStats((prev) => ({
          ...prev,
          totalCredits: creditsData.stats.totalCredits,
          totalCreditsAmount: creditsData.stats.totalAmount,
          overdueCount: creditsData.stats.overdueCount,
        }));
      }
    } catch {
      console.error("Error loading stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadCustomers();
    loadCredits();
    loadPayments();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Guardar cliente
  const handleSaveCustomer = async () => {
    if (!customerForm.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSavingCustomer(true);
    try {
      const url = selectedCustomer ? `/api/customers/${selectedCustomer.id}` : "/api/customers";
      const method = selectedCustomer ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerForm.name,
          phone: customerForm.phone || null,
          email: customerForm.email || null,
          address: customerForm.address || null,
          notes: customerForm.notes || null,
          creditLimit: parseFloat(customerForm.creditLimit) || 0,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(selectedCustomer ? "Cliente actualizado" : "Cliente creado");
        setShowCustomerModal(false);
        resetCustomerForm();
        loadCustomers();
        loadStats();
      } else {
        toast.error(result.error || "Error al guardar cliente");
      }
    } catch {
      toast.error("Error al guardar cliente");
    } finally {
      setSavingCustomer(false);
    }
  };

  // Eliminar cliente
  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este cliente?")) return;

    try {
      const response = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        toast.success("Cliente eliminado");
        loadCustomers();
        loadStats();
      } else {
        toast.error(result.error || "Error al eliminar cliente");
      }
    } catch {
      toast.error("Error al eliminar cliente");
    }
  };

  // Registrar pago
  const handleSavePayment = async () => {
    if (!paymentForm.saleId) {
      toast.error("Seleccione una venta a abonar");
      return;
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    setSavingPayment(true);
    try {
      const response = await fetch("/api/credits/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: paymentForm.saleId,
          customerId: paymentForm.customerId,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes || null,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Pago registrado exitosamente");
        setShowPaymentModal(false);
        resetPaymentForm();
        loadCredits();
        loadPayments();
        loadCustomers();
      } else {
        toast.error(result.error || "Error al registrar pago");
      }
    } catch {
      toast.error("Error al registrar pago");
    } finally {
      setSavingPayment(false);
    }
  };

  // Reset formularios
  const resetCustomerForm = () => {
    setCustomerForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      creditLimit: "0",
    });
    setSelectedCustomer(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      saleId: "",
      customerId: "",
      amount: "",
      paymentMethod: "EFECTIVO",
      notes: "",
    });
    setSelectedCredit(null);
  };

  // Abrir modal de edición
  const openEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      notes: customer.notes || "",
      creditLimit: customer.creditLimit.toString(),
    });
    setShowCustomerModal(true);
  };

  // Abrir modal de pago
  const openPaymentModal = (credit: Credit) => {
    setSelectedCredit(credit);
    setPaymentForm({
      saleId: credit.id,
      customerId: credit.customer.id,
      amount: credit.pendingAmount.toString(),
      paymentMethod: "EFECTIVO",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  // Ver detalle de crédito
  const openCreditDetail = async (credit: Credit) => {
    try {
      const response = await fetch(`/api/sales/${credit.id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedCredit({
          ...credit,
          items: result.data.items,
        });
        setShowCreditDetail(true);
      }
    } catch {
      toast.error("Error al cargar detalle");
    }
  };

  // Badge de estado de crédito
  const CreditStatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "PAGADO":
        return (
          <Badge className="bg-emerald-100 text-emerald-800">
            Pagado
          </Badge>
        );
      case "VENCIDO":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Vencido
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-800">
            Pendiente
          </Badge>
        );
    }
  };

  // Cliente pendientes para selector de pago
  const customersWithCredits = credits.reduce((acc, credit) => {
    if (!acc.find((c) => c.id === credit.customer.id)) {
      acc.push(credit.customer);
    }
    return acc;
  }, [] as Array<{ id: string; name: string; phone: string | null }>);

  if (isLoading) {
    return (
      <AppShell title="Fiados">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Fiados">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-emerald-500" />
              Sistema de Fiados
            </h2>
            <p className="text-gray-600">
              Gestión de clientes y créditos
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Clientes</p>
                  <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                </div>
                <Users className="w-8 h-8 text-gray-200" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.activeCustomers} activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Con Crédito</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.withCredit}</p>
                </div>
                <CreditCard className="w-8 h-8 text-amber-200" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.overLimit} sobre límite
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total en Créditos</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(stats.totalCreditsAmount)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-emerald-200" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {stats.totalCredits} créditos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdueCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-200" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Requieren atención
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="creditos">Créditos</TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
          </TabsList>

          {/* Tab Clientes */}
          <TabsContent value="clientes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Lista de Clientes</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar..."
                        value={searchCustomer}
                        onChange={(e) => setSearchCustomer(e.target.value)}
                        className="pl-9 w-48"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        resetCustomerForm();
                        setShowCustomerModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nuevo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                        {customers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div className="font-medium">{customer.name}</div>
                              {customer.email && (
                                <div className="text-xs text-gray-500">{customer.email}</div>
                              )}
                            </TableCell>
                            <TableCell>{customer.phone || "-"}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(customer.creditLimit)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  customer.isOverLimit ? "text-red-600 font-bold" : ""
                                }
                              >
                                {formatCurrency(customer.pendingBalance)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {customer.isOverLimit ? (
                                <Badge className="bg-red-100 text-red-800">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Sobre límite
                                </Badge>
                              ) : customer.pendingBalance > 0 ? (
                                <Badge className="bg-amber-100 text-amber-800">
                                  Con crédito
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800">
                                  Al día
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCustomer(customer)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {customers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              No hay clientes registrados
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Paginación */}
                {customerTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Página {customerPage} de {customerTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                        disabled={customerPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomerPage((p) => Math.min(customerTotalPages, p + 1))}
                        disabled={customerPage === customerTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Créditos */}
          <TabsContent value="creditos" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>Créditos Pendientes</CardTitle>
                  <div className="flex gap-2">
                    <Select value={creditStatus} onValueChange={setCreditStatus}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente">Pendientes</SelectItem>
                        <SelectItem value="pagado">Pagados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {creditsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Factura</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Abonado</TableHead>
                          <TableHead className="text-right">Pendiente</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {credits.map((credit) => (
                          <TableRow
                            key={credit.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => openCreditDetail(credit)}
                          >
                            <TableCell>
                              <div className="font-medium">{credit.customer.name}</div>
                              {credit.customer.phone && (
                                <div className="text-xs text-gray-500">{credit.customer.phone}</div>
                              )}
                            </TableCell>
                            <TableCell>{credit.invoiceNumber}</TableCell>
                            <TableCell>{formatDate(credit.createdAt)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(credit.total)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(credit.paidAmount)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(credit.pendingAmount)}
                            </TableCell>
                            <TableCell>
                              {credit.creditDueDate ? formatDate(credit.creditDueDate) : "-"}
                            </TableCell>
                            <TableCell>
                              <CreditStatusBadge status={credit.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              {credit.pendingAmount > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openPaymentModal(credit);
                                  }}
                                  className="text-emerald-600"
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Abonar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {credits.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              No hay créditos
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Pagos */}
          <TabsContent value="pagos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Abonos</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Factura</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.createdAt)}</TableCell>
                            <TableCell>
                              <div className="font-medium">{payment.customer.name}</div>
                            </TableCell>
                            <TableCell>{payment.sale.invoiceNumber}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell className="text-gray-500">
                              {payment.notes || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {payments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              No hay pagos registrados
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Paginación */}
                {paymentTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                      Página {paymentPage} de {paymentTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                        disabled={paymentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentPage((p) => Math.min(paymentTotalPages, p + 1))}
                        disabled={paymentPage === paymentTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal Cliente */}
        <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCustomer ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription>
                {selectedCustomer
                  ? "Modifica los datos del cliente"
                  : "Registra un nuevo cliente para fiados"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-3 w-3 inline mr-1" />
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="3001234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-3 w-3 inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Dirección
                </Label>
                <Input
                  id="address"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Dirección del cliente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditLimit">
                  <DollarSign className="h-3 w-3 inline mr-1" />
                  Límite de Crédito
                </Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={customerForm.creditLimit}
                  onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Notas
                </Label>
                <Textarea
                  id="notes"
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  placeholder="Observaciones..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCustomerModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveCustomer}
                disabled={savingCustomer}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {savingCustomer ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Pago */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Abono</DialogTitle>
              <DialogDescription>
                Registra un pago para reducir el saldo pendiente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedCredit && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">Crédito seleccionado</p>
                  <p className="font-medium">{selectedCredit.customer.name}</p>
                  <p className="text-sm">
                    Factura: {selectedCredit.invoiceNumber} - Pendiente:{" "}
                    <span className="font-bold text-amber-600">
                      {formatCurrency(selectedCredit.pendingAmount)}
                    </span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Monto del Abono *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="paymentAmount"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="pl-10"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Método de Pago</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="NEQUI">Nequi</SelectItem>
                    <SelectItem value="DAVIPLATA">Daviplata</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Notas</Label>
                <Textarea
                  id="paymentNotes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Observaciones..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSavePayment}
                disabled={savingPayment}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {savingPayment ? "Registrando..." : "Registrar Pago"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Detalle Crédito */}
        <Dialog open={showCreditDetail} onOpenChange={setShowCreditDetail}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle del Crédito</DialogTitle>
              <DialogDescription>
                {selectedCredit?.invoiceNumber} - {selectedCredit?.customer.name}
              </DialogDescription>
            </DialogHeader>

            {selectedCredit && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedCredit.total)}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Pendiente</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatCurrency(selectedCredit.pendingAmount)}
                    </p>
                  </div>
                </div>

                {selectedCredit.items && selectedCredit.items.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Productos</h4>
                    <ScrollArea className="h-40 border rounded-lg">
                      <div className="p-2 space-y-1">
                        {selectedCredit.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm py-1 border-b last:border-0"
                          >
                            <span>
                              {item.quantity}x {item.product.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <Button
                  onClick={() => {
                    setShowCreditDetail(false);
                    openPaymentModal(selectedCredit);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={selectedCredit.pendingAmount <= 0}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Registrar Abono
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
