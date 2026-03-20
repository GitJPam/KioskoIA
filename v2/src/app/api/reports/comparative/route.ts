import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Reporte comparativo entre períodos
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const period1Start = searchParams.get("period1Start");
    const period1End = searchParams.get("period1End");
    const period2Start = searchParams.get("period2Start");
    const period2End = searchParams.get("period2End");

    if (!period1Start || !period1End || !period2Start || !period2End) {
      return errorResponse("Fechas de períodos requeridas", 400);
    }

    // Obtener ventas de ambos períodos
    const [sales1, sales2] = await Promise.all([
      db.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(period1Start),
            lte: new Date(period1End),
          },
          paymentStatus: "COMPLETADA",
        },
      }),
      db.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(period2Start),
            lte: new Date(period2End),
          },
          paymentStatus: "COMPLETADA",
        },
      }),
    ]);

    // Calcular estadísticas de cada período
    const period1Total = sales1.reduce((acc, sale) => acc + sale.total, 0);
    const period2Total = sales2.reduce((acc, sale) => acc + sale.total, 0);

    const period1 = {
      start: period1Start,
      end: period1End,
      total: period1Total,
      salesCount: sales1.length,
      averageTicket: sales1.length > 0 ? period1Total / sales1.length : 0,
    };

    const period2 = {
      start: period2Start,
      end: period2End,
      total: period2Total,
      salesCount: sales2.length,
      averageTicket: sales2.length > 0 ? period2Total / sales2.length : 0,
    };

    // Calcular diferencia
    const differenceTotal = period2Total - period1Total;
    const differencePercentage =
      period1Total > 0 ? ((period2Total - period1Total) / period1Total) * 100 : 0;

    const trend =
      differencePercentage > 0 ? "up" : differencePercentage < 0 ? "down" : "equal";

    // Generar insights
    let insights = "";
    if (trend === "up") {
      insights = `Las ventas aumentaron ${Math.abs(differencePercentage).toFixed(1)}% en comparación con el período anterior. `;
      if (period2.salesCount > period1.salesCount) {
        insights += `Se realizaron ${period2.salesCount - period1.salesCount} ventas más.`;
      } else {
        insights += `El ticket promedio aumentó de $${period1.averageTicket.toFixed(0)} a $${period2.averageTicket.toFixed(0)}.`;
      }
    } else if (trend === "down") {
      insights = `Las ventas disminuyeron ${Math.abs(differencePercentage).toFixed(1)}% en comparación con el período anterior. `;
      if (period2.salesCount < period1.salesCount) {
        insights += `Se realizaron ${period1.salesCount - period2.salesCount} ventas menos.`;
      }
    } else {
      insights = "Las ventas se mantuvieron estables en comparación con el período anterior.";
    }

    return successResponse({
      period1,
      period2,
      difference: {
        total: differenceTotal,
        percentage: differencePercentage,
        trend,
      },
      insights,
    });
  } catch (error) {
    return handleServerError(error, "Error al generar reporte comparativo");
  }
}
