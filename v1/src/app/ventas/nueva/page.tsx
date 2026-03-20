"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Plus, Minus, Trash2, Loader2, Check, CreditCard, Banknote, Smartphone } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuthStore, useCartStore } from "@/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  salePrice: number;
  stock: number;
  category: {
    id: string;
    name: string;
    color: string;
  };
  isAvailable: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

const paymentMethods = [
  { value: "EFECTIVO", label: "Efectivo", icon: Banknote, color: "bg-green-500" },
  { value: "NEQUI", label: "Nequi", icon: Smartphone, color: "bg-purple-500" },
  { value: "DAVIPLATA", label: "Daviplata", icon: Smartphone, color: "bg-red-500" },
  { value: "TRANSFERENCIA", label: "Transferencia", icon: CreditCard, color: "bg-blue-500" },
] as const;

export default function NuevaVentaPage() {
  const router = useRouter();
  const { isAuthenticated, setLoading, setUser } = useAuthStore();
  const { items, total, addItem, removeItem, updateQuantity, clearCart, getItemCount } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading2] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>("EFECTIVO");
  const [saleComplete, setSaleComplete] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

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

  // Fetch products and categories
  const fetchData = useCallback(async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products?limit=100&available=true"),
        fetch("/api/categories"),
      ]);

      const [productsData, categoriesData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
      ]);

      if (productsData.success) setProducts(productsData.data);
      if (categoriesData.success) setCategories(categoriesData.data);
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
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || product.category.id === selectedCategory;
    return matchesSearch && matchesCategory && product.isAvailable && product.stock > 0;
  });

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    const currentItem = items.find((item) => item.productId === product.id);
    const currentQty = currentItem?.quantity || 0;

    if (currentQty >= product.stock) {
      toast.error("Stock insuficiente", {
        description: `Solo hay ${product.stock} unidades disponibles`,
      });
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      salePrice: product.salePrice,
      stock: product.stock,
      category: product.category,
      isAvailable: product.isAvailable,
    } as Product, 1);

    toast.success("Producto agregado", {
      description: product.name,
    });
  };

  // Process sale
  const processSale = async () => {
    if (items.length === 0) return;

    setProcessing(true);

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod: selectedPayment,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setInvoiceNumber(result.data.invoiceNumber);
        setSaleComplete(true);
        clearCart();

        // Refresh products to update stock
        fetchData();
      } else {
        toast.error("Error al procesar venta", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Nueva Venta">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
        {/* Products Grid */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Products */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pr-4">
              {filteredProducts.map((product) => {
                const cartItem = items.find((item) => item.productId === product.id);
                return (
                  <Card
                    key={product.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      cartItem && "ring-2 ring-emerald-500"
                    )}
                    onClick={() => handleAddToCart(product)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge
                          variant="outline"
                          style={{ borderColor: product.category.color, color: product.category.color }}
                          className="text-xs"
                        >
                          {product.category.name}
                        </Badge>
                        {cartItem && (
                          <Badge className="bg-emerald-500 text-xs">
                            {cartItem.quantity}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-emerald-600">
                          {formatPrice(product.salePrice)}
                        </p>
                        <span className="text-xs text-gray-400">
                          Stock: {product.stock}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Cart */}
        <div className="flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrito
                {getItemCount() > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {getItemCount()} items
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Carrito vacío</p>
                    <p className="text-sm">Toca productos para agregar</p>
                  </div>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 -mx-2">
                    <div className="space-y-3 px-2">
                      {items.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {item.product.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatPrice(item.unitPrice)} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity - 1)
                              }
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity + 1)
                              }
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => removeItem(item.productId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-emerald-600">{formatPrice(total)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={clearCart}
                        disabled={processing}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpiar
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setShowPaymentDialog(true)}
                        disabled={processing}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Cobrar
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Método de Pago</DialogTitle>
            <DialogDescription>
              Selecciona el método de pago para completar la venta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total a pagar</p>
              <p className="text-3xl font-bold text-emerald-600">
                {formatPrice(total)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  variant={selectedPayment === method.value ? "default" : "outline"}
                  className={cn(
                    "h-16 flex-col gap-1",
                    selectedPayment === method.value && "bg-emerald-600 hover:bg-emerald-700"
                  )}
                  onClick={() => setSelectedPayment(method.value)}
                >
                  <method.icon className="w-5 h-5" />
                  <span>{method.label}</span>
                </Button>
              ))}
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={processSale}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Venta
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={saleComplete} onOpenChange={setSaleComplete}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ¡Venta Completada!
            </h2>
            <p className="text-gray-500 mb-4">
              Factura: <span className="font-mono font-medium">{invoiceNumber}</span>
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setSaleComplete(false);
                setShowPaymentDialog(false);
              }}
            >
              Nueva Venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
