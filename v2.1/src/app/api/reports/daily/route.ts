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

// GET - Reporte diario
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Obtener ventas del día
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        paymentStatus: "COMPLETADA",
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
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

    // Productos más vendidos
    const productSales = new Map<string, { 
      productId: string;
      productName: string; 
      categoryName: string;
      quantity: number; 
      total: number; 
    }>();
    
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.subtotal;
        } else {
          productSales.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            categoryName: item.product.category.name,
            quantity: item.quantity,
            total: item.subtotal,
          });
        }
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity);

    // Métodos de pago
    const paymentMethods = sales.reduce(
      (acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        return acc;
      },
      {} as Record<string, number>
    );

    // Ventas por hora
    const hourlyData: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { total: 0, count: 0 };
    }
    
    for (const sale of sales) {
      const hour = new Date(sale.createdAt).getHours();
      hourlyData[hour].total += sale.total;
      hourlyData[hour].count++;
    }

    return successResponse({
      date: dayStart.toISOString(),
      totalSales,
      salesCount,
      itemsSold,
      averageTicket,
      topProducts,
      paymentMethods,
      hourlyData: Object.entries(hourlyData).map(([hour, data]) => ({
        hour: parseInt(hour),
        ...data,
      })),
    });
  } catch (error) {
    return handleServerError(error, "Error al generar reporte diario");
  }
}
