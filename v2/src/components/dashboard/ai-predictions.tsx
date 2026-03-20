"use client";

import { Brain, AlertCircle, TrendingUp, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Prediction {
  productId: string;
  productName: string;
  currentStock: number;
  daysUntilEmpty: number;
  urgency: "critical" | "warning" | "normal";
  suggestedOrderQuantity: number;
}

interface AIPredictionsProps {
  predictions: Prediction[];
}

export function AIPredictions({ predictions }: AIPredictionsProps) {
  const urgentPredictions = predictions.filter(
    (p) => p.urgency === "critical" || p.urgency === "warning"
  );

  if (urgentPredictions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
            <Brain className="w-5 h-5" />
            Predicciones IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-emerald-800 font-medium">Todo en orden</p>
            <p className="text-sm text-emerald-600">
              No hay productos que se agoten próximamente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800">
            <Brain className="w-5 h-5" />
            Predicciones IA
          </div>
          <Badge className="bg-blue-500">
            {urgentPredictions.length} alerta
            {urgentPredictions.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {urgentPredictions.slice(0, 3).map((prediction) => (
            <div
              key={prediction.productId}
              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100"
            >
              <div
                className={`
                  p-2 rounded-lg
                  ${prediction.urgency === "critical" ? "bg-red-100" : "bg-amber-100"}
                `}
              >
                <AlertCircle
                  className={`
                    w-4 h-4
                    ${prediction.urgency === "critical" ? "text-red-600" : "text-amber-600"}
                  `}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">
                  {prediction.productName}
                </p>
                <p className="text-xs text-gray-500">
                  Stock: {prediction.currentStock} uds · Se agota en{" "}
                  {prediction.daysUntilEmpty} días
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600">Sugerido</p>
                <p className="text-sm font-bold text-blue-600">
                  +{prediction.suggestedOrderQuantity}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Ver sugerencias de pedido
        </Button>
      </CardContent>
    </Card>
  );
}
