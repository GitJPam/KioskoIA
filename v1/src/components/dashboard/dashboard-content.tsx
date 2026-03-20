'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Brain,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { CURRENCY_CONFIG } from '@/lib/constants';
import type { DailyReport, StockPrediction, StockAlert } from '@/types';

// Demo data for initial render
const demoWeeklyData = [
  { day: 'Lun', ventas: 125000 },
  { day: 'Mar', ventas: 98000 },
  { day: 'Mié', ventas: 145000 },
  { day: 'Jue', ventas: 132000 },
  { day: 'Vie', ventas: 178000 },
  { day: 'Sáb', ventas: 85000 },
  { day: 'Dom', ventas: 42000 },
];

const demoTopProducts = [
  { name: 'Galletas María', quantity: 45, total: 67500 },
  { name: 'Jugo de Naranja', quantity: 32, total: 64000 },
  { name: 'Chocoramo', quantity: 28, total: 70000 },
  { name: 'Papas Margarita', quantity: 22, total: 55000 },
  { name: 'Gaseosa', quantity: 18, total: 45000 },
];

export function DashboardContent() {
  const [dailyReport, setDailyReport] = React.useState<DailyReport | null>(null);
  const [stockAlerts, setStockAlerts] = React.useState<StockAlert[]>([]);
  const [predictions, setPredictions] = React.useState<StockPrediction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch daily report
        const reportRes = await fetch('/api/reports/daily');
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          setDailyReport(reportData.data);
        }

        // Fetch stock alerts
        const alertsRes = await fetch('/api/inventory/alerts');
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setStockAlerts(alertsData.data?.alerts || []);
        }

        // Fetch AI predictions
        const predRes = await fetch('/api/ai/predict-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daysAhead: 7 }),
        });
        if (predRes.ok) {
          const predData = await predRes.json();
          setPredictions((predData.data || []).slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const todaySales = dailyReport?.totalSales || 0;
  const todayCount = dailyReport?.salesCount || 0;
  const todayItems = dailyReport?.itemsSold || 0;
  const avgTicket = dailyReport?.averageTicket || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Resumen de tu tienda escolar
          </p>
        </div>
        <Link href="/ventas/nueva">
          <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ventas Hoy"
          value={CURRENCY_CONFIG.format(todaySales)}
          description={`${todayCount} ventas realizadas`}
          icon={DollarSign}
          trend={+15}
          trendLabel="vs ayer"
        />
        <StatsCard
          title="Productos Vendidos"
          value={todayItems.toString()}
          description="Unidades hoy"
          icon={ShoppingCart}
          trend={+8}
          trendLabel="vs ayer"
        />
        <StatsCard
          title="Ticket Promedio"
          value={CURRENCY_CONFIG.format(avgTicket)}
          description="Por venta"
          icon={TrendingUp}
        />
        <StatsCard
          title="Alertas de Stock"
          value={stockAlerts.length.toString()}
          description="Productos con stock bajo"
          icon={AlertTriangle}
          variant={stockAlerts.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas de la Semana</CardTitle>
            <CardDescription>Resumen de los últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demoWeeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    dataKey="day"
                    className="text-xs fill-gray-500"
                  />
                  <YAxis
                    className="text-xs fill-gray-500"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [CURRENCY_CONFIG.format(value), 'Ventas']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="ventas"
                    fill="#059669"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Predictions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">Predicciones IA</CardTitle>
            </div>
            <CardDescription>Productos que se agotarán pronto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay predicciones disponibles
              </p>
            ) : (
              predictions.map((pred) => (
                <div
                  key={pred.productId}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div>
                    <p className="text-sm font-medium">{pred.productName}</p>
                    <p className="text-xs text-gray-500">
                      Stock: {pred.currentStock} | {pred.daysUntilEmpty} días
                    </p>
                  </div>
                  <Badge
                    variant={
                      pred.urgency === 'critical'
                        ? 'destructive'
                        : pred.urgency === 'warning'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {pred.urgency === 'critical'
                      ? 'Crítico'
                      : pred.urgency === 'warning'
                      ? 'Alerta'
                      : 'Normal'}
                  </Badge>
                </div>
              ))
            )}
            <Link href="/ia/predicciones">
              <Button variant="ghost" className="w-full" size="sm">
                Ver todas las predicciones
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 5 de hoy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyReport?.topProducts?.slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.productName}</p>
                    <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                  </div>
                  <p className="text-sm font-medium text-emerald-600">
                    {CURRENCY_CONFIG.format(product.total)}
                  </p>
                </div>
              ))}
              {!dailyReport?.topProducts?.length && (
                demoTopProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                    </div>
                    <p className="text-sm font-medium text-emerald-600">
                      {CURRENCY_CONFIG.format(product.total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Alertas de Inventario</CardTitle>
                <CardDescription>Productos con stock bajo</CardDescription>
              </div>
              <Link href="/inventario">
                <Button variant="outline" size="sm">
                  Ver todo
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stockAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No hay alertas de stock
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.productId}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          alert.urgency === 'critical'
                            ? 'bg-red-500'
                            : alert.urgency === 'warning'
                            ? 'bg-orange-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{alert.productName}</p>
                        <p className="text-xs text-gray-500">
                          {alert.currentStock} / {alert.minStock} unidades
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={alert.stockPercentage * 100}
                      className="w-16 h-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  variant?: 'default' | 'warning' | 'success';
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
}: StatsCardProps) {
  return (
    <Card className={variant === 'warning' ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${
          variant === 'warning' ? 'text-orange-500' : 'text-emerald-500'
        }`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          {trend !== undefined && (
            <div
              className={`flex items-center text-xs ${
                trend > 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
