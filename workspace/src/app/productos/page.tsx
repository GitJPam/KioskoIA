'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  Package,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppShell } from '@/components/layout/app-shell';
import { useAuthStore } from '@/store';
import { CURRENCY_CONFIG } from '@/lib/constants';
import type { ProductWithCategory, Category } from '@/types';

export default function ProductosPage() {
  const { isAuthenticated, isLoading: authLoading, setLoading } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);
  const [products, setProducts] = React.useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products?limit=100'),
          fetch('/api/categories'),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.data || []);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mounted && !authLoading && isAuthenticated) {
      fetchData();
    }
  }, [mounted, authLoading, isAuthenticated]);

  if (!mounted || authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <AppShell title="Productos">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Productos
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Gestiona tu catálogo de productos
            </p>
          </div>
          <Link href="/productos/nuevo">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </Link>
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Precio Costo</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="h-12">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 text-gray-300" />
                          <p>No hay productos registrados</p>
                          <Link href="/productos/nuevo">
                            <Button size="sm">Crear primer producto</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                              {product.category?.name === 'Galletas' && '🍪'}
                              {product.category?.name === 'Bebidas' && '🧃'}
                              {product.category?.name === 'Snacks' && '🍿'}
                              {product.category?.name === 'Panadería' && '🥐'}
                              {product.category?.name === 'Saludables' && '🍎'}
                              {!['Galletas', 'Bebidas', 'Snacks', 'Panadería', 'Saludables'].includes(product.category?.name || '') && '📦'}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.sku && (
                                <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{ borderColor: product.category?.color, color: product.category?.color }}
                          >
                            {product.category?.name || 'Sin categoría'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {CURRENCY_CONFIG.format(product.costPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {CURRENCY_CONFIG.format(product.salePrice)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${
                            product.stock <= product.minStock ? 'text-red-600' : 'text-gray-900'
                            }`}>
                            {product.stock}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {product.isAvailable ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
