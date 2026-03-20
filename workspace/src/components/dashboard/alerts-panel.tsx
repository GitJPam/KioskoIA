"use client";

import { AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Alert {
  productId: string;
  productName: string;
  categoryName: string;
  currentStock: number;
  minStock: number;
  urgency: "critical" | "warning" | "normal";
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-emerald-500" />
            Alertas de Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay alertas de stock</p>
            <p className="text-sm">Todo el inventario está en niveles normales</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts.filter((a) => a.urgency === "critical").length;
  const warningCount = alerts.filter((a) => a.urgency === "warning").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas de Stock
          </div>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} crítico</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {warningCount} advertencia
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.productId}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg",
                alert.urgency === "critical"
                  ? "bg-red-50 border border-red-100"
                  : "bg-amber-50 border border-amber-100"
              )}
            >
              <div>
                <p className="font-medium text-gray-900">{alert.productName}</p>
                <p className="text-xs text-gray-500">{alert.categoryName}</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    "text-lg font-bold",
                    alert.urgency === "critical" ? "text-red-600" : "text-amber-600"
                  )}
                >
                  {alert.currentStock}
                </p>
                <p className="text-xs text-gray-500">de {alert.minStock} min</p>
              </div>
            </div>
          ))}
          {alerts.length > 5 && (
            <p className="text-sm text-gray-500 text-center py-2">
              +{alerts.length - 5} productos más
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
