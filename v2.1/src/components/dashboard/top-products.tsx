"use client";

import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TopProduct {
  productId: string;
  productName: string;
  categoryName: string;
  quantity: number;
  total: number;
}

interface TopProductsProps {
  products: TopProduct[];
}

export function TopProducts({ products }: TopProductsProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Productos Más Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <p>No hay datos de ventas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxQuantity = Math.max(...products.map((p) => p.quantity));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Productos Más Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.slice(0, 5).map((product, index) => (
            <div key={product.productId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? "bg-amber-100 text-amber-700" : ""}
                      ${index === 1 ? "bg-gray-100 text-gray-600" : ""}
                      ${index === 2 ? "bg-orange-100 text-orange-700" : ""}
                      ${index > 2 ? "bg-gray-50 text-gray-500" : ""}
                    `}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {product.productName}
                    </p>
                    <p className="text-xs text-gray-500">{product.categoryName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {product.quantity} uds
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(product.total)}
                  </p>
                </div>
              </div>
              <Progress
                value={(product.quantity / maxQuantity) * 100}
                className="h-1.5"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
