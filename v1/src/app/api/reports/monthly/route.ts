import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
  startOfMonth,
  endOfMonth,
} from "@/lib/api-helpers";

// GET - Reporte mensual
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const now = new Date();
    const targetMonth = monthParam ? parseInt(monthParam) - 1 : now.getMonth();
    const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear();

    const targetDate = new Date(targetYear, targetMonth, 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // Obtener ventas del mes
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
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
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const dailyAverage = salesCount > 0 ? totalSales / daysInMonth : 0;

    // Ventas por semana
    const weeklyData: Record<number, { total: number; count: number }> = {};
    for (let i = 1; i <= 5; i++) {
      weeklyData[i] = { total: 0, count: 0 };
    }

    for (const sale of sales) {
      const saleDate = new Date(sale.createdAt);
      const weekNum = Math.ceil(saleDate.getDate() / 7);
      const weekKey = Math.min(weekNum, 5);
      weeklyData[weekKey].total += sale.total;
      weeklyData[weekKey].count++;
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

    // Desglose por categoría
    const categoryBreakdown = new Map<string, { 
      categoryId: string;
      categoryName: string;
      total: number; 
    }>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const catId = item.product.categoryId;
        const existing = categoryBreakdown.get(catId);
        if (existing) {
          existing.total += item.subtotal;
        } else {
          categoryBreakdown.set(catId, {
            categoryId: catId,
            categoryName: item.product.category.name,
            total: item.subtotal,
          });
        }
      }
    }

    const categoryData = Array.from(categoryBreakdown.values())
      .sort((a, b) => b.total - a.total)
      .map((cat) => ({
        ...cat,
        percentage: totalSales > 0 ? Math.round((cat.total / totalSales) * 100) : 0,
      }));

    return successResponse({
      month: targetMonth + 1,
      year: targetYear,
      totalSales,
      salesCount,
      dailyAverage,
      topProducts,
      categoryBreakdown: categoryData,
      weeklyData: Object.entries(weeklyData).map(([week, data]) => ({
        week: parseInt(week),
        ...data,
      })),
    });
  } catch (error) {
    return handleServerError(error, "Error al generar reporte mensual");
  }
}
