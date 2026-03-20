import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Estado del inventario
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Obtener todos los productos con su stock
    const products = await db.product.findMany({
      where: { isAvailable: true },
      include: {
        category: true,
      },
      orderBy: { name: "asc" },
    });

    // Calcular estadísticas
    const totalProducts = products.length;
    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
    const totalValue = products.reduce(
      (acc, p) => acc + p.stock * p.costPrice,
      0
    );
    const lowStock = products.filter((p) => p.stock <= p.minStock).length;
    const criticalStock = products.filter((p) => p.stock <= 5).length;

    // Productos por categoría
    const categoryStats = new Map<
      string,
      { name: string; color: string; count: number; stock: number }
    >();

    for (const product of products) {
      const existing = categoryStats.get(product.categoryId);
      if (existing) {
        existing.count++;
        existing.stock += product.stock;
      } else {
        categoryStats.set(product.categoryId, {
          name: product.category.name,
          color: product.category.color,
          count: 1,
          stock: product.stock,
        });
      }
    }

    return successResponse({
      products,
      stats: {
        totalProducts,
        totalStock,
        totalValue,
        lowStock,
        criticalStock,
        categories: Array.from(categoryStats.values()),
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener inventario");
  }
}
