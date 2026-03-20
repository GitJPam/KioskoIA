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
  Wallet,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Smartphone,
  Building2,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

// Calcular tiempo transcurrido
const getElapsedTime = (openingDate: Date | string) => {
  const start = new Date(openingDate).getTime();
  const now = Date.now();
  const diff = now - start;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

// Tipos
interface User {
  id: string;
  name: string;
  email: string;
}

interface CashRegister {
  id: string;
  userId: string;
  user: User;
  openingDate: Date | string;
  closingDate?: Date | string | null;
  initialCash: number;
  cashSales: number;
  cardSales: number;
  nequiSales: number;
  daviplataSales: number;
  transferSales: number;
  otherSales: number;
  totalSales: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
  status: "ABIERTA" | "CUADRADA" | "DESCUADRADA";
  notes?: string | null;
}

interface RegisterDetail extends CashRegister {
  salesCount: number;
  itemsSold: number;
  averageTicket: number;
  sales: Array<{
    id: string;
    total: number;
    paymentMethod: string;
    createdAt: Date | string;
    items: Array<{
      quantity: number;
      product: { name: string };
    }>;
  }>;
}

interface HistoryItem {
  id: string;
  user: User;
  openingDate: Date | string;
  closingDate?: Date | string | null;
  initialCash: number;
  totalSales: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
  status: "ABIERTA" | "CUADRADA" | "DESCUADRADA";
}

export default function CajaPage() {
  // Estados
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [initialCash, setInitialCash] = useState("");
  const [openNotes, setOpenNotes] = useState("");

  // Estado para cierre
  const [actualCash, setActualCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);

  // Historial
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal detalle
  const [selectedRegister, setSelectedRegister] = useState<RegisterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  // Cargar caja actual
  const loadCurrentRegister = useCallback(async () => {
    try {
      const response = await fetch("/api/cash-register");
      const result = await response.json();
      if (result.success && result.data) {
        setCurrentRegister(result.data);
      } else {
        setCurrentRegister(null);
      }
    } catch {
      toast.error("Error al cargar el estado de la caja");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar historial
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", historyPage.toString());
      params.append("limit", "10");
      if (filterStatus !== "all") {
        params.append("status", filterStatus);
      }
      if (dateFrom) {
        params.append("dateFrom", dateFrom);
      }
      if (dateTo) {
        params.append("dateTo", dateTo);
      }

      const response = await fetch(`/api/cash-register/history?${params.toString()}`);
      const result = await response.json();
      if (result.data) {
        setHistory(result.data);
        setTotalPages(result.pagination.totalPages);
      }
    } catch {
      toast.error("Error al cargar el historial");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    loadCurrentRegister();
  }, [loadCurrentRegister]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Abrir caja
  const handleOpenRegister = async () => {
    if (!initialCash || parseFloat(initialCash) < 0) {
      toast.error("Ingrese un monto inicial válido");
      return;
    }

    setIsOpening(true);
    try {
      const response = await fetch("/api/cash-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialCash: parseFloat(initialCash),
          notes: openNotes || undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setCurrentRegister(result.data);
        setInitialCash("");
        setOpenNotes("");
        toast.success("Caja abierta exitosamente");
        loadHistory();
      } else {
        toast.error(result.error || "Error al abrir la caja");
      }
    } catch {
      toast.error("Error al abrir la caja");
    } finally {
      setIsOpening(false);
    }
  };

  // Cerrar caja
  const handleCloseRegister = async () => {
    if (!actualCash || parseFloat(actualCash) < 0) {
      toast.error("Ingrese el monto de efectivo real");
      return;
    }

    setIsClosing(true);
    try {
      const response = await fetch("/api/cash-register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualCash: parseFloat(actualCash),
          notes: closeNotes || undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setCurrentRegister(null);
        setActualCash("");
        setCloseNotes("");
        setShowCloseForm(false);
        toast.success(
          result.data?.status === "CUADRADA"
            ? "Caja cerrada y cuadrada correctamente"
            : "Caja cerrada con diferencia"
        );
        loadHistory();
      } else {
        toast.error(result.error || "Error al cerrar la caja");
      }
    } catch {
      toast.error("Error al cerrar la caja");
    } finally {
      setIsClosing(false);
    }
  };

  // Ver detalle de caja
  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const response = await fetch(`/api/cash-register/${id}`);
      const result = await response.json();
      if (result.success) {
        setSelectedRegister(result.data);
      } else {
        toast.error("Error al cargar el detalle");
        setShowDetail(false);
      }
    } catch {
      toast.error("Error al cargar el detalle");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Badge de estado
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "CUADRADA":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Cuadrada
          </Badge>
        );
      case "DESCUADRADA":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Descuadrada
          </Badge>
        );
      case "ABIERTA":
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Abierta
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calcular ventas totales esperadas
  const calculateExpectedTotal = () => {
    if (!currentRegister) return 0;
    return (
      currentRegister.cashSales +
      currentRegister.cardSales +
      currentRegister.nequiSales +
      currentRegister.daviplataSales +
      currentRegister.transferSales +
      currentRegister.otherSales
    );
  };

  // Actualizar tiempo transcurrido
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <AppShell title="Cierre de Caja">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Cierre de Caja">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cierre de Caja</h1>
            <p className="text-gray-600">Gestiona la apertura y cierre de caja diaria</p>
          </div>
        </div>

        {/* Estado de caja actual */}
        {!currentRegister ? (
          // Formulario para abrir caja
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                Abrir Nueva Caja
              </CardTitle>
              <CardDescription>
                No hay una caja abierta. Ingrese el monto inicial para comenzar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialCash">Monto Inicial en Efectivo *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="initialCash"
                      type="number"
                      placeholder="0"
                      value={initialCash}
                      onChange={(e) => setInitialCash(e.target.value)}
                      className="pl-10"
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openNotes">Notas (opcional)</Label>
                  <Input
                    id="openNotes"
                    placeholder="Ej: Turno mañana"
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleOpenRegister}
                disabled={isOpening}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
              >
                {isOpening ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Abriendo...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Abrir Caja
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : !showCloseForm ? (
          // Resumen de caja abierta
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    Caja Abierta
                  </CardTitle>
                  <CardDescription>
                    Abierta por {currentRegister.user.name} el {formatDate(currentRegister.openingDate)}
                  </CardDescription>
                </div>
                <StatusBadge status="ABIERTA" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-500 mb-1">Monto Inicial</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(currentRegister.initialCash)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-500 mb-1">Tiempo Transcurrido</p>
                  <p className="text-xl font-bold text-amber-600 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {getElapsedTime(currentRegister.openingDate)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-500 mb-1">Ventas Totales</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(calculateExpectedTotal())}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-gray-500 mb-1">Efectivo en Caja</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(currentRegister.initialCash + currentRegister.cashSales)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowCloseForm(true)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Cerrar Caja
              </Button>
            </CardContent>
          </Card>
        ) : (
          // Formulario de cierre
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                Cerrar Caja
              </CardTitle>
              <CardDescription>
                Revise el resumen de ventas y registre el efectivo real contado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumen de ventas por método */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Ventas Efectivo</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(currentRegister.cashSales)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Ventas Nequi</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(currentRegister.nequiSales)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Ventas Daviplata</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(currentRegister.daviplataSales)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Ventas Tarjeta</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(currentRegister.cardSales)}
                  </p>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-cyan-600" />
                    <span className="text-sm font-medium text-cyan-800">Transferencias</span>
                  </div>
                  <p className="text-2xl font-bold text-cyan-900">
                    {formatCurrency(currentRegister.transferSales)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MoreHorizontal className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-800">Otros Ingresos</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(currentRegister.otherSales)}
                  </p>
                </div>
              </div>

              {/* Total ventas */}
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-emerald-800">Total Ventas del Día</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(calculateExpectedTotal())}
                  </p>
                </div>
              </div>

              {/* Cálculo de efectivo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm text-gray-500 mb-1">Efectivo Inicial</p>
                    <p className="text-lg font-semibold">{formatCurrency(currentRegister.initialCash)}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm text-gray-500 mb-1">+ Ventas en Efectivo</p>
                    <p className="text-lg font-semibold">{formatCurrency(currentRegister.cashSales)}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-600 mb-1">= Efectivo Esperado</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(currentRegister.initialCash + currentRegister.cashSales)}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="actualCash">Efectivo Real Contado *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="actualCash"
                        type="number"
                        placeholder="0"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="pl-10 text-lg"
                        min="0"
                      />
                    </div>
                  </div>
                  {actualCash && (
                    <div
                      className={`p-4 rounded-lg border ${
                        parseFloat(actualCash) ===
                        currentRegister.initialCash + currentRegister.cashSales
                          ? "bg-emerald-50 border-emerald-200"
                          : parseFloat(actualCash) >
                            currentRegister.initialCash + currentRegister.cashSales
                          ? "bg-blue-50 border-blue-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <p className="text-sm mb-1">
                        {parseFloat(actualCash) ===
                        currentRegister.initialCash + currentRegister.cashSales
                          ? "Diferencia: Caja cuadrada"
                          : parseFloat(actualCash) >
                          currentRegister.initialCash + currentRegister.cashSales
                          ? "Diferencia: Sobrante"
                          : "Diferencia: Faltante"}
                      </p>
                      <p
                        className={`text-xl font-bold flex items-center gap-2 ${
                          parseFloat(actualCash) ===
                          currentRegister.initialCash + currentRegister.cashSales
                            ? "text-emerald-700"
                            : parseFloat(actualCash) >
                              currentRegister.initialCash + currentRegister.cashSales
                            ? "text-blue-700"
                            : "text-red-700"
                        }`}
                      >
                        {parseFloat(actualCash) ===
                        currentRegister.initialCash + currentRegister.cashSales ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : parseFloat(actualCash) >
                        currentRegister.initialCash + currentRegister.cashSales ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                        {formatCurrency(
                          Math.abs(
                            parseFloat(actualCash) -
                              (currentRegister.initialCash + currentRegister.cashSales)
                          )
                        )}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="closeNotes">Notas del Cierre</Label>
                    <Textarea
                      id="closeNotes"
                      placeholder="Observaciones, novedades del día..."
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCloseForm(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCloseRegister}
                  disabled={isClosing || !actualCash}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                >
                  {isClosing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cerrando...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Confirmar Cierre
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de cierres */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Historial de Cierres
                </CardTitle>
                <CardDescription>Registro de todas las cajas cerradas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Fecha Desde</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha Hasta</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="CUADRADA">Cuadrada</SelectItem>
                    <SelectItem value="DESCUADRADA">Descuadrada</SelectItem>
                    <SelectItem value="ABIERTA">Abierta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabla */}
            {historyLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay registros en el historial
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-right">Ventas Totales</TableHead>
                      <TableHead className="text-right">Efectivo Esperado</TableHead>
                      <TableHead className="text-right">Efectivo Real</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewDetail(item.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.closingDate
                                ? formatDate(item.closingDate).split(",")[0]
                                : formatDate(item.openingDate).split(",")[0]}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.closingDate ? formatDate(item.closingDate) : "En curso"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{item.user.name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalSales)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.expectedCash !== null ? formatCurrency(item.expectedCash) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.actualCash !== null ? formatCurrency(item.actualCash) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.difference !== null ? (
                            <span
                              className={
                                item.difference === 0
                                  ? "text-emerald-600"
                                  : item.difference > 0
                                  ? "text-blue-600"
                                  : "text-red-600"
                              }
                            >
                              {item.difference >= 0 ? "+" : ""}
                              {formatCurrency(item.difference)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Página {historyPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                    disabled={historyPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de detalle */}
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Detalle de Caja
              </DialogTitle>
              <DialogDescription>
                Información completa del cierre de caja
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : selectedRegister ? (
              <div className="space-y-6">
                {/* Información general */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Apertura</p>
                    <p className="font-medium">{formatDate(selectedRegister.openingDate)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Cierre</p>
                    <p className="font-medium">
                      {selectedRegister.closingDate
                        ? formatDate(selectedRegister.closingDate)
                        : "En curso"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Usuario</p>
                    <p className="font-medium">{selectedRegister.user.name}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Estado</p>
                    <StatusBadge status={selectedRegister.status} />
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-emerald-600">Ventas</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {selectedRegister.salesCount}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-blue-600">Productos</p>
                    <p className="text-lg font-bold text-blue-700">
                      {selectedRegister.itemsSold}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-purple-600">Ticket Prom.</p>
                    <p className="text-lg font-bold text-purple-700">
                      {formatCurrency(selectedRegister.averageTicket)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-orange-600">Total</p>
                    <p className="text-lg font-bold text-orange-700">
                      {formatCurrency(selectedRegister.totalSales)}
                    </p>
                  </div>
                </div>

                {/* Desglose por método de pago */}
                <div>
                  <h4 className="font-medium mb-3">Desglose por Método de Pago</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-sm text-green-800">Efectivo</span>
                      <span className="font-medium text-green-900">
                        {formatCurrency(selectedRegister.cashSales)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-sm text-blue-800">Nequi</span>
                      <span className="font-medium text-blue-900">
                        {formatCurrency(selectedRegister.nequiSales)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-sm text-purple-800">Daviplata</span>
                      <span className="font-medium text-purple-900">
                        {formatCurrency(selectedRegister.daviplataSales)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <span className="text-sm text-orange-800">Tarjeta</span>
                      <span className="font-medium text-orange-900">
                        {formatCurrency(selectedRegister.cardSales)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                      <span className="text-sm text-cyan-800">Transferencia</span>
                      <span className="font-medium text-cyan-900">
                        {formatCurrency(selectedRegister.transferSales)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-800">Otros</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(selectedRegister.otherSales)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resumen de cuadre */}
                {selectedRegister.status !== "ABIERTA" && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Resumen de Cuadre</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Efectivo Inicial:</span>
                        <span className="font-medium">{formatCurrency(selectedRegister.initialCash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ventas Efectivo:</span>
                        <span className="font-medium">{formatCurrency(selectedRegister.cashSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Efectivo Esperado:</span>
                        <span className="font-medium">{formatCurrency(selectedRegister.expectedCash || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Efectivo Real:</span>
                        <span className="font-medium">{formatCurrency(selectedRegister.actualCash || 0)}</span>
                      </div>
                      <div className="flex justify-between col-span-2 pt-2 border-t">
                        <span className="text-gray-600">Diferencia:</span>
                        <span
                          className={`font-bold ${
                            (selectedRegister.difference || 0) === 0
                              ? "text-emerald-600"
                              : (selectedRegister.difference || 0) > 0
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        >
                          {(selectedRegister.difference || 0) >= 0 ? "+" : ""}
                          {formatCurrency(selectedRegister.difference || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
