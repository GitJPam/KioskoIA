"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, AlertTriangle, Edit2, Loader2, Plus, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku?: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock: number;
  isHealthy: boolean;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
    color: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface StockAlert {
  critical: number;
  warning: number;
}

export default function InventarioPage() {
  const router = useRouter();
  const { isAuthenticated, setLoading, setUser } = useAuthStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<StockAlert>({ critical: 0, warning: 0 });
  const [loading, setLoading2] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [saving, setSaving] = useState(false);

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
      const [productsRes, categoriesRes, alertsRes] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/categories"),
        fetch("/api/inventory/alerts"),
      ]);

      const [productsData, categoriesData, alertsData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
        alertsRes.json(),
      ]);

      if (productsData.success) setProducts(productsData.data);
      if (categoriesData.success) setCategories(categoriesData.data);
      if (alertsData.success) {
        setAlerts({
          critical: alertsData.data.summary.critical,
          warning: alertsData.data.summary.warning,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading2(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || product.category.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle edit
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setStockAdjustment("");
    setAdjustmentReason("");
    setShowDialog(true);
  };

  // Handle save adjustment
  const handleSaveAdjustment = async () => {
    if (!editingProduct || !stockAdjustment) return;

    const adjustment = parseInt(stockAdjustment);
    if (isNaN(adjustment)) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    setSaving(true);

    try {
      // Update stock via API
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: editingProduct.stock + adjustment,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Stock actualizado", {
          description: `${editingProduct.name}: ${editingProduct.stock} → ${editingProduct.stock + adjustment}`,
        });
        fetchData();
        setShowDialog(false);
      } else {
        toast.error("Error al actualizar", {
          description: result.error,
        });
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
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

  // Get stock status
  const getStockStatus = (product: Product) => {
    const percentage = (product.stock / product.maxStock) * 100;
    if (product.stock <= 5) return { urgency: "critical", color: "bg-red-500", percentage };
    if (product.stock <= product.minStock) return { urgency: "warning", color: "bg-amber-500", percentage };
    return { urgency: "normal", color: "bg-emerald-500", percentage };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Inventario">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Productos</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="w-8 h-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stock Crítico</p>
                  <p className="text-2xl font-bold text-red-600">{alerts.critical}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stock Bajo</p>
                  <p className="text-2xl font-bold text-amber-600">{alerts.warning}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-amber-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-24rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: product.category.color,
                              color: product.category.color,
                            }}
                          >
                            {product.category.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(product.salePrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <p className={cn(
                              "font-bold",
                              status.urgency === "critical" && "text-red-600",
                              status.urgency === "warning" && "text-amber-600",
                              status.urgency === "normal" && "text-gray-900"
                            )}>
                              {product.stock}
                            </p>
                            <Progress value={status.percentage} className="h-1.5" />
                            <p className="text-xs text-gray-400">
                              Min: {product.minStock}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {status.urgency === "critical" && (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                              Crítico
                            </Badge>
                          )}
                          {status.urgency === "warning" && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              Bajo
                            </Badge>
                          )}
                          {status.urgency === "normal" && (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{editingProduct.name}</p>
                <p className="text-sm text-gray-500">
                  Stock actual: <span className="font-bold">{editingProduct.stock}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Ajuste de stock</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStockAdjustment(String(parseInt(stockAdjustment || "0") - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={stockAdjustment}
                    onChange={(e) => setStockAdjustment(e.target.value)}
                    placeholder="0"
                    className="text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStockAdjustment(String(parseInt(stockAdjustment || "0") + 1))}
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Usa números negativos para reducir stock
                </p>
              </div>

              {stockAdjustment && (
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-700">
                    Nuevo stock: <span className="font-bold">
                      {editingProduct.stock + parseInt(stockAdjustment || "0")}
                    </span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Razón del ajuste (opcional)</Label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ej: Conteo físico, devolución..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSaveAdjustment}
                  disabled={saving || !stockAdjustment}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
