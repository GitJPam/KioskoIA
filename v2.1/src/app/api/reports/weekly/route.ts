import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "@/lib/api-helpers";

// GET - Reporte semanal
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const weekStart = startOfWeek(targetDate);
    const weekEnd = endOfWeek(targetDate);

    // Obtener ventas de la semana
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: weekStart,
          lte: weekEnd,
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
      orderBy: { createdAt: "asc" },
    });

    // Calcular estadísticas
    const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
    const salesCount = sales.length;
    const dailyAverage = salesCount > 0 ? totalSales / 7 : 0;

    // Ventas por día
    const dailyData: Record<string, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      dailyData[dateKey] = { total: 0, count: 0 };
    }

    for (const sale of sales) {
      const dateKey = new Date(sale.createdAt).toISOString().split("T")[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].total += sale.total;
        dailyData[dateKey].count++;
      }
    }

    // Mejor y peor día
    let bestDay = { date: "", total: 0 };
    let worstDay = { date: "", total: Infinity };

    for (const [date, data] of Object.entries(dailyData)) {
      if (data.total > bestDay.total) {
        bestDay = { date, total: data.total };
      }
      if (data.total < worstDay.total && data.total > 0) {
        worstDay = { date, total: data.total };
      }
    }

    if (worstDay.total === Infinity) {
      worstDay = { date: "", total: 0 };
    }

    // Productos más vendidos
    const productSales = new Map<string, { 
      productId: string;
      productName: string; 
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
            quantity: item.quantity,
            total: item.subtotal,
          });
        }
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return successResponse({
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      totalSales,
      salesCount,
      dailyAverage,
      bestDay,
      worstDay,
      topProducts,
      dailyData: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data,
      })),
    });
  } catch (error) {
    return handleServerError(error, "Error al generar reporte semanal");
  }
}
