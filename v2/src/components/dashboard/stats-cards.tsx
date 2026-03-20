"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBg = "bg-emerald-100",
}: StatCardProps) {
  const trend =
    change !== undefined
      ? change > 0
        ? "up"
        : change < 0
        ? "down"
        : "neutral"
      : null;

  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {trend === "up" && (
                  <>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-emerald-600 font-medium">
                      +{change}%
                    </span>
                  </>
                )}
                {trend === "down" && (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">
                      {change}%
                    </span>
                  </>
                )}
                {trend === "neutral" && (
                  <>
                    <Minus className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">0%</span>
                  </>
                )}
                {changeLabel && (
                  <span className="text-xs text-gray-400">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", iconBg)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsCardsProps {
  stats: {
    totalSales: number;
    salesCount: number;
    itemsSold: number;
    averageTicket: number;
    previousPeriodChange?: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Ventas Hoy"
        value={formatCurrency(stats.totalSales)}
        change={stats.previousPeriodChange}
        changeLabel="vs ayer"
        icon={
          <svg
            className="w-6 h-6 text-emerald-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        iconBg="bg-emerald-100"
      />
      <StatCard
        title="Transacciones"
        value={stats.salesCount.toString()}
        icon={
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        }
        iconBg="bg-blue-100"
      />
      <StatCard
        title="Productos Vendidos"
        value={stats.itemsSold.toString()}
        icon={
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        }
        iconBg="bg-amber-100"
      />
      <StatCard
        title="Ticket Promedio"
        value={formatCurrency(stats.averageTicket)}
        icon={
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        }
        iconBg="bg-purple-100"
      />
    </div>
  );
}
