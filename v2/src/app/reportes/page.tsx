"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ShoppingBag,
  Package,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
interface PeriodInfo {
  type: string;
  from: string;
  to: string;
}

interface Resumen {
  totalVentas: number;
  totalGanancias: number;
  totalProductos: number;
  numTransacciones: number;
  ticketPromedio: number;
  margenGanancia: number;
}

interface Comparacion {
  cambioVentas: number;
  cambioGanancias: number;
  cambioTransacciones: number;
  cambioProductos: number;
}

interface ReportData {
  periodo: PeriodInfo;
  resumen: Resumen;
  comparacion: Comparacion;
  desglose: {
    ventasPorMetodo: Record<string, number>;
    ventasPorEstado: Record<string, number>;
    ventasPorDia: Array<{
      fecha: string;
      total: number;
      ganancia: number;
      numVentas: number;
    }>;
  };
}

interface SalesPeriodData {
  periodo: PeriodInfo;
  data: Array<{
    fecha: string;
    fechaFin?: string;
    label: string;
    total: number;
    ganancia: number;
    numVentas: number;
    productos: number;
  }>;
  resumen: {
    total: number;
    ganancia: number;
    numVentas: number;
    productos: number;
    promedioVentas: number;
    promedioGanancia: number;
    promedioTransacciones: number;
  };
  analisis: {
    mejor: {
      fecha: string;
      label: string;
      total: number;
    } | null;
    peor: {
      fecha: string;
      label: string;
      total: number;
    } | null;
    tendencia: number;
  };
}

interface TopProduct {
  rank: number;
  productId: string;
  productName: string;
  productSku: string | null;
  categoryName: string;
  categoryColor: string;
  quantity: number;
  total: number;
  profit: number;
  avgPrice: number;
}

interface TopProductsData {
  periodo: PeriodInfo;
  topProducts: TopProduct[];
  topByQuantity: TopProduct[];
  topByRevenue: TopProduct[];
  topByProfit: TopProduct[];
  summary: {
    totalProducts: number;
    totalRevenue: number;
    totalProfit: number;
    totalQuantity: number;
    avgQuantityPerSale: number;
    sortBy: string;
  };
}

interface ProfitData {
  periodo: PeriodInfo;
  resumen: {
    ingresos: {
      brutos: number;
      descuentos: number;
      netos: number;
    };
    costos: {
      ventas: number;
      compras: number;
    };
    ganancia: {
      bruta: number;
      margen: number;
    };
    credito: {
      ventasCredito: number;
      pagosRecibidos: number;
    };
  };
  comparacion: {
    ingresos: number;
    costos: number;
    ganancia: number;
  };
  desglosePorCategoria: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    ingresos: number;
    costos: number;
    ganancia: number;
    margen: number;
    numVentas: number;
    productos: number;
  }>;
  desglosePorMetodoPago: Array<{
    metodo: string;
    ingresos: number;
    numVentas: number;
    ganancia: number;
    porcentaje: number;
  }>;
  topProductosGanancia: Array<{
    productId: string;
    productName: string;
    categoryName: string;
    ingresos: number;
    costos: number;
    ganancia: number;
    margen: number;
    cantidad: number;
  }>;
  productosBajoRendimiento: Array<{
    productId: string;
    productName: string;
    categoryName: string;
    ingresos: number;
    costos: number;
    ganancia: number;
    margen: number;
    cantidad: number;
  }>;
}

type PeriodOption = "day" | "week" | "month" | "year" | "custom";
type ChartPeriodOption = "day" | "week" | "month";

export default function ReportesPage() {
  const router = useRouter();
  const { isAuthenticated, setLoading, setUser } = useAuthStore();

  // State
  const [loadingData, setLoadingData] = useState(true);
  const [periodOption, setPeriodOption] = useState<PeriodOption>("month");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodOption>("day");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Data
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [salesData, setSalesData] = useState<SalesPeriodData | null>(null);
  const [topProductsData, setTopProductsData] = useState<TopProductsData | null>(null);
  const [profitsData, setProfitsData] = useState<ProfitData | null>(null);

  // Top products sort
  const [sortBy, setSortBy] = useState<"quantity" | "revenue" | "profit">("quantity");
  const [exporting, setExporting] = useState(false);

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

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const from = subDays(today, 30);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    setLoadingData(true);
    try {
      const params = new URLSearchParams();

      if (periodOption === "custom") {
        params.append("from", dateFrom);
        params.append("to", dateTo);
      } else {
        params.append("period", periodOption);
      }

      const [reportRes, salesRes, topProductsRes, profitsRes] = await Promise.all([
        fetch(`/api/reports?${params.toString()}`),
        fetch(`/api/reports/sales?from=${dateFrom}&to=${dateTo}&period=${chartPeriod}`),
        fetch(`/api/reports/top-products?from=${dateFrom}&to=${dateTo}&limit=10&sortBy=${sortBy}`),
        fetch(`/api/reports/profits?${params.toString()}`),
      ]);

      const [reportJson, salesJson, topProductsJson, profitsJson] = await Promise.all([
        reportRes.json(),
        salesRes.json(),
        topProductsRes.json(),
        profitsRes.json(),
      ]);

      if (reportJson.success) setReportData(reportJson.data);
      if (salesJson.success) setSalesData(salesJson.data);
      if (topProductsJson.success) setTopProductsData(topProductsJson.data);
      if (profitsJson.success) setProfitsData(profitsJson.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoadingData(false);
    }
  }, [dateFrom, dateTo, periodOption, chartPeriod, sortBy]);

  useEffect(() => {
    if (isAuthenticated && dateFrom && dateTo) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Handle quick period buttons
  const handleQuickPeriod = (option: PeriodOption) => {
    setPeriodOption(option);
    const today = new Date();

    switch (option) {
      case "day":
        setDateFrom(today.toISOString().split("T")[0]);
        setDateTo(today.toISOString().split("T")[0]);
        break;
      case "week": {
        const weekStart = subDays(today, today.getDay() === 0 ? 6 : today.getDay() - 1);
        setDateFrom(weekStart.toISOString().split("T")[0]);
        setDateTo(today.toISOString().split("T")[0]);
        break;
      }
      case "month": {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setDateFrom(monthStart.toISOString().split("T")[0]);
        setDateTo(today.toISOString().split("T")[0]);
        break;
      }
      case "year": {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        setDateFrom(yearStart.toISOString().split("T")[0]);
        setDateTo(today.toISOString().split("T")[0]);
        break;
      }
    }
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Get change badge
  const getChangeBadge = (change: number) => {
    if (change === 0) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-600 gap-1">
          <Minus className="w-3 h-3" />
          Sin cambio
        </Badge>
      );
    }
    if (change > 0) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 gap-1">
          <TrendingUp className="w-3 h-3" />
          {formatPercent(change)}
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 gap-1">
        <TrendingDown className="w-3 h-3" />
        {formatPercent(change)}
      </Badge>
    );
  };

  // Export data
  const handleExport = async (type: "sales" | "products" | "profits", format: "csv" | "json") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        type,
        format,
        from: dateFrom,
        to: dateTo,
      });

      const response = await fetch(`/api/reports/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Error al exportar");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_${type}_${dateFrom}_${dateTo}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Reporte exportado como ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error al exportar el reporte");
    } finally {
      setExporting(false);
    }
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      EFECTIVO: "Efectivo",
      TARJETA: "Tarjeta",
      NEQUI: "Nequi",
      DAVIPLATA: "Daviplata",
      TRANSFERENCIA: "Transferencia",
      OTRO: "Otro",
    };
    return labels[method] || method;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Reportes de Ventas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-emerald-500" />
              Reportes de Ventas
            </h2>
            <p className="text-gray-500">
              Análisis completo de ventas, productos y ganancias
            </p>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("sales", "csv")}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("sales", "json")}
              disabled={exporting}
            >
              <FileText className="w-4 h-4 mr-1" />
              JSON
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              {/* Quick period buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={periodOption === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickPeriod("day")}
                  className={periodOption === "day" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  Hoy
                </Button>
                <Button
                  variant={periodOption === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickPeriod("week")}
                  className={periodOption === "week" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  Semana
                </Button>
                <Button
                  variant={periodOption === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickPeriod("month")}
                  className={periodOption === "month" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  Mes
                </Button>
                <Button
                  variant={periodOption === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQuickPeriod("year")}
                  className={periodOption === "year" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  Año
                </Button>
              </div>

              {/* Date range */}
              <div className="flex flex-col sm:flex-row gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPeriodOption("custom");
                    }}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPeriodOption("custom");
                    }}
                    className="w-40"
                  />
                </div>
              </div>

              {/* Chart period selector */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Agrupar por</Label>
                <Select value={chartPeriod} onValueChange={(v) => setChartPeriod(v as ChartPeriodOption)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Día</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Ventas</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatPrice(reportData?.resumen.totalVentas || 0)}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-emerald-200" />
                  </div>
                  <div className="mt-2">
                    {getChangeBadge(reportData?.comparacion.cambioVentas || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Ganancias</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatPrice(reportData?.resumen.totalGanancias || 0)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-emerald-200" />
                  </div>
                  <div className="mt-2">
                    {getChangeBadge(reportData?.comparacion.cambioGanancias || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Transacciones</p>
                      <p className="text-2xl font-bold">
                        {reportData?.resumen.numTransacciones || 0}
                      </p>
                    </div>
                    <ShoppingBag className="w-8 h-8 text-gray-200" />
                  </div>
                  <div className="mt-2">
                    {getChangeBadge(reportData?.comparacion.cambioTransacciones || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Productos Vendidos</p>
                      <p className="text-2xl font-bold">
                        {reportData?.resumen.totalProductos || 0}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-gray-200" />
                  </div>
                  <div className="mt-2">
                    {getChangeBadge(reportData?.comparacion.cambioProductos || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Margen</p>
                      <p className="text-2xl font-bold">
                        {(reportData?.resumen.margenGanancia || 0).toFixed(1)}%
                      </p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Ticket: {formatPrice(reportData?.resumen.ticketPromedio || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ventas por Período</CardTitle>
                <CardDescription>
                  {salesData?.analisis.mejor && (
                    <span className="text-emerald-600">
                      Mejor: {salesData.analisis.mejor.label} ({formatPrice(salesData.analisis.mejor.total)})
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData?.data || []}>
                      <defs>
                        <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.4} />
                        </linearGradient>
                        <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#6b7280", fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 12 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          formatPrice(value),
                          name === "total" ? "Ventas" : "Ganancia",
                        ]}
                        labelStyle={{ color: "#374151" }}
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total" name="Ventas" fill="url(#colorVentas)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="ganancia" name="Ganancia" fill="url(#colorGanancia)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Two columns: Top Products & Profits */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Productos Más Vendidos</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant={sortBy === "quantity" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("quantity")}
                      className={sortBy === "quantity" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      Por Cantidad
                    </Button>
                    <Button
                      variant={sortBy === "revenue" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("revenue")}
                      className={sortBy === "revenue" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      Por Ingresos
                    </Button>
                    <Button
                      variant={sortBy === "profit" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy("profit")}
                      className={sortBy === "profit" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      Por Ganancia
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Ganancia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topProductsData?.topProducts.map((product, index) => (
                          <TableRow key={product.productId}>
                            <TableCell>
                              <span
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                  index === 0
                                    ? "bg-amber-100 text-amber-700"
                                    : index === 1
                                    ? "bg-gray-200 text-gray-700"
                                    : index === 2
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-100 text-gray-600"
                                )}
                              >
                                {product.rank}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{product.productName}</p>
                                <p className="text-xs text-gray-500">{product.categoryName}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {product.quantity}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatPrice(product.total)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-emerald-600">
                              {formatPrice(product.profit)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!topProductsData?.topProducts || topProductsData.topProducts.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              No hay datos disponibles
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Profits Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ganancias y Pérdidas</CardTitle>
                  <CardDescription>
                    Período: {dateFrom} - {dateTo}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Income */}
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Ingresos Netos</span>
                        {getChangeBadge(profitsData?.comparacion.ingresos || 0)}
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatPrice(profitsData?.resumen.ingresos.netos || 0)}
                      </p>
                      {profitsData?.resumen.ingresos.descuentos ? (
                        <p className="text-xs text-gray-500">
                          Descuentos: {formatPrice(profitsData.resumen.ingresos.descuentos)}
                        </p>
                      ) : null}
                    </div>

                    {/* Costs */}
                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Costo de Ventas</span>
                        {getChangeBadge(-(profitsData?.comparacion.costos || 0))}
                      </div>
                      <p className="text-2xl font-bold text-red-600">
                        {formatPrice(profitsData?.resumen.costos.ventas || 0)}
                      </p>
                    </div>

                    {/* Profit */}
                    <div className="p-4 bg-emerald-100 rounded-lg border-2 border-emerald-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 font-medium">Ganancia Bruta</span>
                        {getChangeBadge(profitsData?.comparacion.ganancia || 0)}
                      </div>
                      <p className="text-3xl font-bold text-emerald-700">
                        {formatPrice(profitsData?.resumen.ganancia.bruta || 0)}
                      </p>
                      <p className="text-sm text-emerald-600 font-medium">
                        Margen: {(profitsData?.resumen.ganancia.margen || 0).toFixed(1)}%
                      </p>
                    </div>

                    {/* Category breakdown */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Por Categoría</h4>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {profitsData?.desglosePorCategoria.slice(0, 5).map((cat) => (
                            <div
                              key={cat.categoryId}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: cat.categoryColor }}
                                />
                                <span className="text-sm">{cat.categoryName}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">{formatPrice(cat.ganancia)}</p>
                                <p className="text-xs text-gray-500">{cat.margen.toFixed(1)}% margen</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Desglose por Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {profitsData?.desglosePorMetodoPago.map((method) => (
                    <div
                      key={method.metodo}
                      className="p-4 bg-gray-50 rounded-lg text-center"
                    >
                      <p className="text-sm text-gray-500">{getPaymentMethodLabel(method.metodo)}</p>
                      <p className="text-lg font-bold">{formatPrice(method.ingresos)}</p>
                      <p className="text-xs text-gray-400">
                        {method.numVentas} ventas ({method.porcentaje.toFixed(1)}%)
                      </p>
                    </div>
                  ))}
                  {(!profitsData?.desglosePorMetodoPago || profitsData.desglosePorMetodoPago.length === 0) && (
                    <div className="col-span-full text-center text-gray-500 py-4">
                      No hay datos de métodos de pago
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Low Performance Products */}
            {profitsData?.productosBajoRendimiento && profitsData.productosBajoRendimiento.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-amber-600">
                    Productos con Bajo Rendimiento
                  </CardTitle>
                  <CardDescription>
                    Productos con margen menor al 10%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Costos</TableHead>
                          <TableHead className="text-right">Ganancia</TableHead>
                          <TableHead className="text-right">Margen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profitsData.productosBajoRendimiento.map((product) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">{product.productName}</TableCell>
                            <TableCell className="text-gray-500">{product.categoryName}</TableCell>
                            <TableCell className="text-right">{formatPrice(product.ingresos)}</TableCell>
                            <TableCell className="text-right">{formatPrice(product.costos)}</TableCell>
                            <TableCell className="text-right">{formatPrice(product.ganancia)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                {product.margen.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
