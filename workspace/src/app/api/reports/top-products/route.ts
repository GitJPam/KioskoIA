import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "@/lib/api-helpers";

// GET - Productos más vendidos
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week"; // day, week, month
    const limit = parseInt(searchParams.get("limit") || "10");

    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "day":
        startDate = startOfDay();
        endDate = endOfDay();
        break;
      case "month":
        startDate = startOfMonth();
        endDate = endOfMonth();
        break;
      default:
        startDate = startOfWeek();
        endDate = endOfWeek();
    }

    // Obtener ventas del período
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
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

    // Calcular ventas por producto
    const productSales = new Map<string, {
      productId: string;
      productName: string;
      categoryName: string;
      categoryColor: string;
      quantity: number;
      total: number;
      profit: number;
    }>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productSales.get(item.productId);
        const profit = (item.unitPrice - item.product.costPrice) * item.quantity;
        
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.subtotal;
          existing.profit += profit;
        } else {
          productSales.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            categoryName: item.product.category.name,
            categoryColor: item.product.category.color,
            quantity: item.quantity,
            total: item.subtotal,
            profit,
          });
        }
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    const totalRevenue = topProducts.reduce((acc, p) => acc + p.total, 0);
    const totalProfit = topProducts.reduce((acc, p) => acc + p.profit, 0);

    return successResponse({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      topProducts,
      summary: {
        totalProducts: productSales.size,
        totalRevenue,
        totalProfit,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener productos más vendidos");
  }
}
