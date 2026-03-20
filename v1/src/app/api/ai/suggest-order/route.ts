import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { subDays } from "date-fns";

// GET - Sugerencia de pedido a proveedores
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get("daysAhead") || "14");

    // Obtener productos con stock bajo o que se agotarán pronto
    const products = await db.product.findMany({
      where: { isAvailable: true },
      include: { category: true },
    });

    // Obtener ventas de los últimos 30 días
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sales = await db.sale.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        paymentStatus: "COMPLETADA",
      },
      include: { items: true },
    });

    // Calcular tasa de venta
    const salesRate = new Map<string, number>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const current = salesRate.get(item.productId) || 0;
        salesRate.set(item.productId, current + item.quantity);
      }
    }

    // Obtener proveedores
    const suppliers = await db.supplier.findMany({
      where: { isActive: true },
    });

    // Generar sugerencias
    const suggestions = products
      .map((product) => {
        const totalSold = salesRate.get(product.id) || 0;
        const dailySalesRate = totalSold / 30;
        const projectedDemand = Math.ceil(dailySalesRate * daysAhead);
        const currentNeed = projectedDemand - product.stock;
        
        if (currentNeed <= 0) return null;

        const suggestedQuantity = Math.max(currentNeed, product.minStock);
        const estimatedCost = suggestedQuantity * product.costPrice;

        // Asignar proveedor aleatorio (en producción, sería por relación real)
        const supplier = suppliers.length > 0 
          ? suppliers[Math.floor(Math.random() * suppliers.length)]
          : null;

        return {
          productId: product.id,
          productName: product.name,
          categoryName: product.category.name,
          currentStock: product.stock,
          minStock: product.minStock,
          dailySalesRate: Math.round(dailySalesRate * 10) / 10,
          projectedDemand,
          suggestedQuantity,
          unitCost: product.costPrice,
          estimatedCost,
          supplier: supplier ? {
            id: supplier.id,
            name: supplier.name,
          } : null,
          reason: `Stock actual: ${product.stock}. Demanda proyectada (${daysAhead} días): ${projectedDemand} unidades.`,
          urgency: currentNeed <= product.minStock ? "high" : "medium",
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => {
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });

    // Calcular totales
    const totalEstimatedCost = suggestions.reduce((acc, s) => acc + s.estimatedCost, 0);
    const totalItems = suggestions.reduce((acc, s) => acc + s.suggestedQuantity, 0);

    // Agrupar por proveedor
    const bySupplier = suggestions.reduce((acc, s) => {
      const supplierId = s.supplier?.id || "sin-proveedor";
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplier: s.supplier || { name: "Sin proveedor asignado" },
          items: [],
          totalCost: 0,
        };
      }
      acc[supplierId].items.push(s);
      acc[supplierId].totalCost += s.estimatedCost;
      return acc;
    }, {} as Record<string, { supplier: { name: string }; items: typeof suggestions; totalCost: number }>);

    return successResponse({
      suggestions,
      bySupplier: Object.values(bySupplier),
      summary: {
        totalProducts: suggestions.length,
        totalItems,
        totalEstimatedCost,
        highPriority: suggestions.filter((s) => s.urgency === "high").length,
      },
      daysAhead,
    });
  } catch (error) {
    return handleServerError(error, "Error al generar sugerencias de pedido");
  }
}
