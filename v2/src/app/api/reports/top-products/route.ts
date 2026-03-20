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
    const period = searchParams.get("period") || "week"; // day, week, month, custom
    const limit = parseInt(searchParams.get("limit") || "10");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const sortBy = searchParams.get("sortBy") || "quantity"; // quantity, revenue, profit

    // Determinar rango de fechas
    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      startDate = startOfDay(new Date(from));
      endDate = endOfDay(new Date(to));
    } else {
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
    const productSales = new Map<
      string,
      {
        productId: string;
        productName: string;
        productSku: string | null;
        categoryName: string;
        categoryId: string;
        categoryColor: string;
        quantity: number;
        total: number;
        profit: number;
        costTotal: number;
        avgPrice: number;
        numSales: number;
      }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productSales.get(item.productId);
        const costPrice = item.costPrice || item.product.costPrice;
        const profit = (item.unitPrice - costPrice) * item.quantity;

        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.subtotal;
          existing.profit += profit;
          existing.costTotal += costPrice * item.quantity;
          existing.numSales += 1;
        } else {
          productSales.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku,
            categoryName: item.product.category.name,
            categoryId: item.product.categoryId,
            categoryColor: item.product.category.color,
            quantity: item.quantity,
            total: item.subtotal,
            profit,
            costTotal: costPrice * item.quantity,
            avgPrice: item.unitPrice,
            numSales: 1,
          });
        }
      }
    }

    // Calcular precio promedio real
    for (const [, product] of productSales) {
      product.avgPrice = product.quantity > 0 ? product.total / product.quantity : 0;
    }

    // Ordenar según criterio
    const sortFn = {
      quantity: (a: (typeof productSales)[0][1], b: (typeof productSales)[0][1]) =>
        b.quantity - a.quantity,
      revenue: (a: (typeof productSales)[0][1], b: (typeof productSales)[0][1]) =>
        b.total - a.total,
      profit: (a: (typeof productSales)[0][1], b: (typeof productSales)[0][1]) =>
        b.profit - a.profit,
    };

    const allProducts = Array.from(productSales.values()).sort(sortFn[sortBy] || sortFn.quantity);

    // Top por cantidad
    const topByQuantity = [...allProducts]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)
      .map((p, index) => ({ rank: index + 1, ...p }));

    // Top por ingresos
    const topByRevenue = [...allProducts]
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((p, index) => ({ rank: index + 1, ...p }));

    // Top por ganancia
    const topByProfit = [...allProducts]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit)
      .map((p, index) => ({ rank: index + 1, ...p }));

    // Productos principales según sortBy
    const topProducts = allProducts.slice(0, limit).map((p, index) => ({
      rank: index + 1,
      ...p,
    }));

    // Resumen por categoría
    const categoryStats = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categoryColor: string;
        quantity: number;
        total: number;
        profit: number;
        numProducts: number;
      }
    >();

    for (const product of allProducts) {
      const existing = categoryStats.get(product.categoryId);
      if (existing) {
        existing.quantity += product.quantity;
        existing.total += product.total;
        existing.profit += product.profit;
        existing.numProducts += 1;
      } else {
        categoryStats.set(product.categoryId, {
          categoryId: product.categoryId,
          categoryName: product.categoryName,
          categoryColor: product.categoryColor,
          quantity: product.quantity,
          total: product.total,
          profit: product.profit,
          numProducts: 1,
        });
      }
    }

    const topCategories = Array.from(categoryStats.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Totales
    const totalRevenue = allProducts.reduce((acc, p) => acc + p.total, 0);
    const totalProfit = allProducts.reduce((acc, p) => acc + p.profit, 0);
    const totalQuantity = allProducts.reduce((acc, p) => acc + p.quantity, 0);
    const totalProducts = productSales.size;

    // Ticket promedio por producto
    const avgQuantityPerSale =
      sales.length > 0 ? totalQuantity / sales.length : 0;

    return successResponse({
      periodo: {
        type: period,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      topProducts,
      topByQuantity,
      topByRevenue,
      topByProfit,
      topCategories,
      summary: {
        totalProducts,
        totalRevenue,
        totalProfit,
        totalQuantity,
        avgQuantityPerSale,
        sortBy,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener productos más vendidos");
  }
}
