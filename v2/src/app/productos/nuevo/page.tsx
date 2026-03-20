'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppShell } from '@/components/layout/app-shell';
import { useAuthStore } from '@/store';
import { CURRENCY_CONFIG } from '@/lib/constants';
import type { Category } from '@/types';

export default function NuevoProductoPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, setLoading, user } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [costPrice, setCostPrice] = React.useState('');
  const [salePrice, setSalePrice] = React.useState('');
  const [stock, setStock] = React.useState('0');
  const [minStock, setMinStock] = React.useState('10');
  const [maxStock, setMaxStock] = React.useState('100');
  const [isHealthy, setIsHealthy] = React.useState(false);
  const [isAvailable, setIsAvailable] = React.useState(true);

  // Check auth
  React.useEffect(() => {
    setMounted(true);
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (data.success && data.data?.user) {
          useAuthStore.getState().setUser(data.data.user);
        } else {
          window.location.href = '/login';
        }
      } catch {
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [setLoading]);

  // Fetch categories
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.data || []);
          if (data.data?.length > 0) {
            setCategoryId(data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    if (mounted && !authLoading && isAuthenticated) {
      fetchCategories();
    }
  }, [mounted, authLoading, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !categoryId || !salePrice) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          sku: sku || undefined,
          categoryId,
          costPrice: parseFloat(costPrice) || 0,
          salePrice: parseFloat(salePrice),
          stock: parseInt(stock) || 0,
          minStock: parseInt(minStock) || 10,
          maxStock: parseInt(maxStock) || 100,
          isHealthy,
          isAvailable,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/productos');
      } else {
        alert(data.error || 'Error al crear producto');
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted || authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Nuevo Producto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/productos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nuevo Producto</h1>
            <p className="text-gray-500">Agrega un nuevo producto al catálogo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>Detalles principales del producto</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Galletas María"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción del producto"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU / Código</Label>
                    <Input
                      id="sku"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Ej: GAL001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Precios</CardTitle>
                  <CardDescription>Configura los precios del producto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">Precio de Costo</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salePrice">Precio de Venta *</Label>
                      <Input
                        id="salePrice"
                        type="number"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  {costPrice && salePrice && (
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-700">
                        Margen de ganancia:{' '}
                        <span className="font-semibold">
                          {Math.round(((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(salePrice)) * 100)}%
                        </span>
                        {' '}(
                        {CURRENCY_CONFIG.format(parseFloat(salePrice) - parseFloat(costPrice))}
                        )
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventario</CardTitle>
                  <CardDescription>Configura el stock inicial y límites</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock Inicial</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Stock Mínimo</Label>
                      <Input
                        id="minStock"
                        type="number"
                        value={minStock}
                        onChange={(e) => setMinStock(e.target.value)}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxStock">Stock Máximo</Label>
                      <Input
                        id="maxStock"
                        type="number"
                        value={maxStock}
                        onChange={(e) => setMaxStock(e.target.value)}
                        min="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Options */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Opciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center justify-between flex-1">
                  <div className="space-y-0.5">
                    <Label>Producto Saludable</Label>
                    <p className="text-sm text-gray-500">Marca como opción saludable</p>
                  </div>
                  <Switch
                    checked={isHealthy}
                    onCheckedChange={setIsHealthy}
                  />
                </div>

                <div className="flex items-center justify-between flex-1">
                  <div className="space-y-0.5">
                    <Label>Disponible para Venta</Label>
                    <p className="text-sm text-gray-500">El producto aparecerá en el POS</p>
                  </div>
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Link href="/productos">
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Producto
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
