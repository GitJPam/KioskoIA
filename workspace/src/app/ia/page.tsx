"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Brain, AlertTriangle, ShoppingCart, TrendingUp, Package, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

interface Prediction {
  productId: string;
  productName: string;
  categoryName: string;
  currentStock: number;
  minStock: number;
  dailySalesRate: number;
  daysUntilEmpty: number;
  estimatedEmptyDate: string;
  urgency: "critical" | "warning" | "normal";
  suggestedOrderQuantity: number;
  last30DaysSales: number;
}

interface Suggestion {
  productId: string;
  productName: string;
  categoryName: string;
  currentStock: number;
  minStock: number;
  dailySalesRate: number;
  projectedDemand: number;
  suggestedQuantity: number;
  unitCost: number;
  estimatedCost: number;
  supplier: { id: string; name: string } | null;
  reason: string;
  urgency: "high" | "medium" | "low";
}

export default function IAPage() {
  const router = useRouter();
  const { isAuthenticated, setLoading, setUser } = useAuthStore();

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading2] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("predictions");

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
      const [predictionsRes, suggestionsRes] = await Promise.all([
        fetch("/api/ai/predict-stock"),
        fetch("/api/ai/suggest-order"),
      ]);

      const [predictionsData, suggestionsData] = await Promise.all([
        predictionsRes.json(),
        suggestionsRes.json(),
      ]);

      if (predictionsData.success) setPredictions(predictionsData.data.predictions);
      if (suggestionsData.success) setSuggestions(suggestionsData.data.suggestions);
    } catch (error) {
      console.error("Error fetching AI data:", error);
    } finally {
      setLoading2(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  };

  // Stats
  const criticalCount = predictions.filter((p) => p.urgency === "critical").length;
  const warningCount = predictions.filter((p) => p.urgency === "warning").length;
  const normalCount = predictions.filter((p) => p.urgency === "normal").length;

  const totalSuggestedCost = suggestions.reduce((acc, s) => acc + s.estimatedCost, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Predicciones IA">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-7 h-7 text-blue-500" />
              Inteligencia Artificial
            </h2>
            <p className="text-gray-500">
              Predicciones y sugerencias basadas en análisis de datos
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Actualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Críticos</p>
                  <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600">Advertencia</p>
                  <p className="text-2xl font-bold text-amber-700">{warningCount}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600">Normal</p>
                  <p className="text-2xl font-bold text-emerald-700">{normalCount}</p>
                </div>
                  <Package className="w-8 h-8 text-emerald-400" />
                </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Inversión Sugerida</p>
                  <p className="text-xl font-bold text-blue-700">{formatPrice(totalSuggestedCost)}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predictions">Predicciones de Stock</TabsTrigger>
            <TabsTrigger value="suggestions">Sugerencias de Pedido</TabsTrigger>
          </TabsList>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análisis de Stock</CardTitle>
                <CardDescription>
                  Predicción de cuándo se agotará cada producto basado en ventas históricas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-28rem)]">
                  <div className="space-y-3">
                    {predictions.map((prediction) => (
                      <div
                        key={prediction.productId}
                        className={cn(
                          "p-4 rounded-lg border",
                          prediction.urgency === "critical" && "bg-red-50 border-red-200",
                          prediction.urgency === "warning" && "bg-amber-50 border-amber-200",
                          prediction.urgency === "normal" && "bg-gray-50 border-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{prediction.productName}</p>
                            <p className="text-sm text-gray-500">{prediction.categoryName}</p>
                          </div>
                          <Badge
                            className={cn(
                              prediction.urgency === "critical" && "bg-red-500",
                              prediction.urgency === "warning" && "bg-amber-500",
                              prediction.urgency === "normal" && "bg-emerald-500"
                            )}
                          >
                            {prediction.urgency === "critical" && "Crítico"}
                            {prediction.urgency === "warning" && "Advertencia"}
                            {prediction.urgency === "normal" && "Normal"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Stock Actual</p>
                            <p className="font-bold">{prediction.currentStock}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Ventas/Día</p>
                            <p className="font-bold">{prediction.dailySalesRate.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Días hasta agotar</p>
                            <p className={cn(
                              "font-bold",
                              prediction.urgency === "critical" && "text-red-600",
                              prediction.urgency === "warning" && "text-amber-600"
                            )}>
                              {prediction.daysUntilEmpty >= 999 ? "∞" : prediction.daysUntilEmpty}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Fecha estimada</p>
                            <p className="font-bold">
                              {prediction.daysUntilEmpty >= 999 ? "-" : formatDate(prediction.estimatedEmptyDate)}
                            </p>
                          </div>
                        </div>

                        {prediction.urgency !== "normal" && (
                          <div className="flex items-center gap-2 p-2 bg-white rounded border">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">
                              Sugerencia: Pedir <strong>{prediction.suggestedOrderQuantity}</strong> unidades
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sugerencias de Pedido</CardTitle>
                <CardDescription>
                  Productos que deberías pedir para los próximos 14 días
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-28rem)]">
                  <div className="space-y-3">
                    {suggestions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No hay sugerencias de pedido</p>
                        <p className="text-sm">El inventario está bien abastecido</p>
                      </div>
                    ) : (
                      suggestions.map((suggestion) => (
                        <div
                          key={suggestion.productId}
                          className={cn(
                            "p-4 rounded-lg border",
                            suggestion.urgency === "high" && "bg-red-50 border-red-200",
                            suggestion.urgency === "medium" && "bg-amber-50 border-amber-200",
                            suggestion.urgency === "low" && "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{suggestion.productName}</p>
                              <p className="text-sm text-gray-500">{suggestion.categoryName}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                suggestion.urgency === "high" && "border-red-500 text-red-600",
                                suggestion.urgency === "medium" && "border-amber-500 text-amber-600"
                              )}
                            >
                              {suggestion.urgency === "high" ? "Alta prioridad" : "Media prioridad"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-500">Stock actual</p>
                              <p className="font-bold">{suggestion.currentStock}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Sugerido</p>
                              <p className="font-bold text-blue-600">+{suggestion.suggestedQuantity}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Costo estimado</p>
                              <p className="font-bold">{formatPrice(suggestion.estimatedCost)}</p>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500">{suggestion.reason}</p>

                          {suggestion.supplier && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-400">Proveedor:</span>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.supplier.name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {suggestions.length > 0 && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600">Inversión Total Sugerida</p>
                      <p className="text-2xl font-bold text-blue-700">{formatPrice(totalSuggestedCost)}</p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Generar Orden
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
