"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Calendar, Download, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "@/store";

interface DailyReport {
  date: string;
  totalSales: number;
  salesCount: number;
  itemsSold: number;
  averageTicket: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    categoryName: string;
    quantity: number;
    total: number;
  }>;
  hourlyData: Array<{ hour: number; total: number; count: number }>;
}

interface WeeklyReport {
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

export default function VentasPage() {
  const router = useRouter();
  const { isAuthenticated, setLoading, setUser } = useAuthStore();

  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading2] = useState(true);
  const [activeTab, setActiveTab] = useState("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

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

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [dailyRes, weeklyRes] = await Promise.all([
        fetch(`/api/reports/daily?date=${selectedDate}`),
        fetch(`/api/reports/weekly?date=${selectedDate}`),
      ]);

      const [dailyData, weeklyData] = await Promise.all([
        dailyRes.json(),
        weeklyRes.json(),
      ]);

      if (dailyData.success) setDailyReport(dailyData.data);
      if (weeklyData.success) setWeeklyReport(weeklyData.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading2(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format date
  const formatDateLabel = (dateStr: string) => {
    return format(parseISO(dateStr), "EEE d", { locale: es });
  };

  if (loading) {
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-emerald-500" />
              Reportes de Ventas
            </h2>
            <p className="text-gray-500">
              Análisis de ventas por período
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">Semanal</TabsTrigger>
            <TabsTrigger value="daily">Diario</TabsTrigger>
          </TabsList>

          {/* Weekly Tab */}
          <TabsContent value="weekly" className="space-y-4 mt-4">
            {weeklyReport && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Ventas Totales</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatPrice(weeklyReport.totalSales)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Transacciones</p>
                      <p className="text-2xl font-bold">{weeklyReport.salesCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Promedio Diario</p>
                      <p className="text-2xl font-bold">{formatPrice(weeklyReport.dailyAverage)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Mejor Día</p>
                      <p className="text-lg font-bold">
                        {weeklyReport.bestDay.date ? formatDateLabel(weeklyReport.bestDay.date) : "-"}
                      </p>
                      <p className="text-sm text-emerald-600">
                        {formatPrice(weeklyReport.bestDay.total)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ventas de la Semana</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyReport.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDateLabel}
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                          />
                          <YAxis
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value: number) => [formatPrice(value), "Ventas"]}
                            labelFormatter={(label) => formatDateLabel(label as string)}
                          />
                          <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Productos Más Vendidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weeklyReport.topProducts.slice(0, 5).map((product, i) => (
                        <div
                          key={product.productId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}
                            `}>
                              {i + 1}
                            </span>
                            <span className="font-medium">{product.productName}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{product.quantity} uds</p>
                            <p className="text-sm text-gray-500">{formatPrice(product.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Daily Tab */}
          <TabsContent value="daily" className="space-y-4 mt-4">
            {dailyReport && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Ventas del Día</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatPrice(dailyReport.totalSales)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Transacciones</p>
                      <p className="text-2xl font-bold">{dailyReport.salesCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Productos Vendidos</p>
                      <p className="text-2xl font-bold">{dailyReport.itemsSold}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-500">Ticket Promedio</p>
                      <p className="text-2xl font-bold">{formatPrice(dailyReport.averageTicket)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Hourly Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ventas por Hora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyReport.hourlyData.filter(h => h.total > 0)}>
                          <defs>
                            <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="hour"
                            tickFormatter={(h) => `${h}:00`}
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                          />
                          <YAxis
                            tick={{ fill: "#6b7280", fontSize: 12 }}
                            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(value: number) => [formatPrice(value), "Ventas"]}
                            labelFormatter={(label) => `${label}:00`}
                          />
                          <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#059669"
                            fillOpacity={1}
                            fill="url(#colorHourly)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Productos Más Vendidos Hoy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dailyReport.topProducts.slice(0, 5).map((product, i) => (
                        <div
                          key={product.productId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}
                            `}>
                              {i + 1}
                            </span>
                            <div>
                              <span className="font-medium">{product.productName}</span>
                              <p className="text-xs text-gray-500">{product.categoryName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{product.quantity} uds</p>
                            <p className="text-sm text-gray-500">{formatPrice(product.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
