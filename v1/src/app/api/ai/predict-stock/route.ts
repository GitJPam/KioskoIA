import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { subDays, differenceInDays } from "date-fns";

// GET - Predicción de stock
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const daysAhead = parseInt(searchParams.get("daysAhead") || "7");

    // Obtener productos
    const whereClause = productId ? { id: productId } : { isAvailable: true };
    const products = await db.product.findMany({
      where: whereClause,
      include: { category: true },
    });

    // Obtener ventas de los últimos 30 días para calcular tasa
    const thirtyDaysAgo = subDays(new Date(), 30);
    const sales = await db.sale.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        paymentStatus: "COMPLETADA",
      },
      include: {
        items: true,
      },
    });

    // Calcular tasa de venta por producto
    const salesRate = new Map<string, number>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const current = salesRate.get(item.productId) || 0;
        salesRate.set(item.productId, current + item.quantity);
      }
    }

    // Calcular predicciones
    const predictions = products.map((product) => {
      const totalSold = salesRate.get(product.id) || 0;
      const dailySalesRate = totalSold / 30; // Promedio diario
      const daysUntilEmpty = dailySalesRate > 0 
        ? Math.floor(product.stock / dailySalesRate) 
        : 999; // Si no hay ventas, no se agota

      // Determinar urgencia
      let urgency: "critical" | "warning" | "normal" = "normal";
      if (daysUntilEmpty <= 3) {
        urgency = "critical";
      } else if (daysUntilEmpty <= 7) {
        urgency = "warning";
      }

      // Sugerir cantidad a pedir
      const suggestedOrderQuantity = Math.max(
        product.maxStock - product.stock,
        Math.ceil(dailySalesRate * daysAhead)
      );

      // Fecha estimada de agotamiento
      const estimatedEmptyDate = new Date();
      estimatedEmptyDate.setDate(estimatedEmptyDate.getDate() + daysUntilEmpty);

      return {
        productId: product.id,
        productName: product.name,
        categoryName: product.category.name,
        currentStock: product.stock,
        minStock: product.minStock,
        dailySalesRate: Math.round(dailySalesRate * 10) / 10,
        daysUntilEmpty: Math.min(daysUntilEmpty, 999),
        estimatedEmptyDate: estimatedEmptyDate.toISOString(),
        urgency,
        suggestedOrderQuantity: Math.max(suggestedOrderQuantity, 0),
        last30DaysSales: totalSold,
      };
    });

    // Ordenar por urgencia
    predictions.sort((a, b) => {
      const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });

    // Resumen
    const summary = {
      total: predictions.length,
      critical: predictions.filter((p) => p.urgency === "critical").length,
      warning: predictions.filter((p) => p.urgency === "warning").length,
      normal: predictions.filter((p) => p.urgency === "normal").length,
    };

    return successResponse({
      predictions,
      summary,
      analyzedDays: 30,
      targetDays: daysAhead,
    });
  } catch (error) {
    return handleServerError(error, "Error al predecir stock");
  }
}
