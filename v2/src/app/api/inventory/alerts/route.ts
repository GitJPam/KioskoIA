import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Alertas de stock bajo
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Obtener todos los productos disponibles
    const products = await db.product.findMany({
      where: {
        isAvailable: true,
      },
      include: {
        category: true,
      },
      orderBy: { stock: "asc" },
    });

    // Filtrar productos con stock bajo (stock <= minStock)
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);

    // Clasificar por urgencia y construir alertas
    const alerts = lowStockProducts.map((product) => ({
      productId: product.id,
      productName: product.name,
      category: product.category.name,
      currentStock: product.stock,
      minStock: product.minStock,
      maxStock: product.maxStock,
      urgency: product.stock <= 5 ? "critical" : product.stock <= 10 ? "warning" : "normal" as const,
      stockPercentage: product.maxStock > 0 ? Math.round((product.stock / product.maxStock) * 100) / 100 : 0,
    }));

    // Estadísticas
    const critical = alerts.filter((a) => a.urgency === "critical").length;
    const warning = alerts.filter((a) => a.urgency === "warning").length;

    return successResponse({
      alerts,
      summary: {
        total: alerts.length,
        critical,
        warning,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener alertas de inventario");
  }
}
