import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
  startOfDay,
  endOfDay,
} from "@/lib/api-helpers";

// GET - Resumen de ventas del día
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const today = startOfDay();
    const todayEnd = endOfDay();

    // Obtener ventas del día
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: today,
          lte: todayEnd,
        },
        paymentStatus: "COMPLETADA",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Calcular estadísticas
    const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
    const salesCount = sales.length;
    const itemsSold = sales.reduce(
      (acc, sale) => acc + sale.items.reduce((a, item) => a + item.quantity, 0),
      0
    );
    const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

    // Productos más vendidos del día
    const productSales = new Map<string, { name: string; quantity: number; total: number }>();
    
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.subtotal;
        } else {
          productSales.set(item.productId, {
            name: item.product.name,
            quantity: item.quantity,
            total: item.subtotal,
          });
        }
      }
    }

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        total: data.total,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Métodos de pago
    const paymentMethods = sales.reduce(
      (acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        return acc;
      },
      {} as Record<string, number>
    );

    return successResponse({
      date: today.toISOString(),
      totalSales,
      salesCount,
      itemsSold,
      averageTicket,
      topProducts,
      paymentMethods,
      sales: sales.slice(0, 10), // Últimas 10 ventas
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener ventas del día");
  }
}
