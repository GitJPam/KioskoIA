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
  calculatePercentageChange,
} from "@/lib/api-helpers";

// GET - Resumen general de ventas
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const period = searchParams.get("period") || "month"; // day, week, month, custom

    // Determinar rango de fechas
    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      // Rango personalizado
      startDate = startOfDay(new Date(from));
      endDate = endOfDay(new Date(to));
    } else {
      // Períodos predefinidos
      switch (period) {
        case "day":
          startDate = startOfDay();
          endDate = endOfDay();
          break;
        case "week":
          startDate = startOfWeek();
          endDate = endOfWeek();
          break;
        default:
          startDate = startOfMonth();
          endDate = endOfMonth();
      }
    }

    // Obtener ventas del período actual
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
            product: true,
          },
        },
      },
    });

    // Calcular métricas del período actual
    const totalVentas = sales.reduce((acc, sale) => acc + sale.total, 0);
    const numTransacciones = sales.length;
    const totalProductos = sales.reduce(
      (acc, sale) => acc + sale.items.reduce((a, item) => a + item.quantity, 0),
      0
    );

    // Calcular ganancias (precio venta - precio costo)
    const totalGanancias = sales.reduce((acc, sale) => {
      return (
        acc +
        sale.items.reduce((a, item) => {
          const costPrice = item.costPrice || item.product.costPrice;
          return a + (item.unitPrice - costPrice) * item.quantity;
        }, 0)
      );
    }, 0);

    // Calcular período anterior para comparación
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    const previousSales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
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

    const previousTotalVentas = previousSales.reduce(
      (acc, sale) => acc + sale.total,
      0
    );
    const previousNumTransacciones = previousSales.length;
    const previousTotalProductos = previousSales.reduce(
      (acc, sale) =>
        acc + sale.items.reduce((a, item) => a + item.quantity, 0),
      0
    );
    const previousGanancias = previousSales.reduce((acc, sale) => {
      return (
        acc +
        sale.items.reduce((a, item) => {
          const costPrice = item.costPrice || item.product.costPrice;
          return a + (item.unitPrice - costPrice) * item.quantity;
        }, 0)
      );
    }, 0);

    // Calcular cambios porcentuales
    const cambioVentas = calculatePercentageChange(
      totalVentas,
      previousTotalVentas
    );
    const cambioTransacciones = calculatePercentageChange(
      numTransacciones,
      previousNumTransacciones
    );
    const cambioProductos = calculatePercentageChange(
      totalProductos,
      previousTotalProductos
    );
    const cambioGanancias = calculatePercentageChange(
      totalGanancias,
      previousGanancias
    );

    // Ticket promedio
    const ticketPromedio = numTransacciones > 0 ? totalVentas / numTransacciones : 0;
    const previousTicketPromedio =
      previousNumTransacciones > 0
        ? previousTotalVentas / previousNumTransacciones
        : 0;

    // Margen de ganancia
    const margenGanancia = totalVentas > 0 ? (totalGanancias / totalVentas) * 100 : 0;

    // Ventas por método de pago
    const ventasPorMetodo = sales.reduce(
      (acc, sale) => {
        const metodo = sale.paymentMethod;
        acc[metodo] = (acc[metodo] || 0) + sale.total;
        return acc;
      },
      {} as Record<string, number>
    );

    // Ventas por estado de pago
    const todasLasVentas = await db.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        total: true,
        paymentStatus: true,
      },
    });

    const ventasPorEstado = todasLasVentas.reduce(
      (acc, sale) => {
        acc[sale.paymentStatus] = (acc[sale.paymentStatus] || 0) + sale.total;
        return acc;
      },
      {} as Record<string, number>
    );

    // Resumen por día (últimos 7 días o dentro del rango)
    const ventasPorDia: { fecha: string; total: number; ganancia: number; numVentas: number }[] = [];
    const diasAMostrar = Math.min(
      7,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    for (let i = diasAMostrar - 1; i >= 0; i--) {
      const diaStart = startOfDay(new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000));
      const diaEnd = endOfDay(new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000));

      const ventasDia = sales.filter(
        (s) => new Date(s.createdAt) >= diaStart && new Date(s.createdAt) <= diaEnd
      );

      const totalDia = ventasDia.reduce((acc, s) => acc + s.total, 0);
      const gananciaDia = ventasDia.reduce((acc, sale) => {
        return (
          acc +
          sale.items.reduce((a, item) => {
            const costPrice = item.costPrice || item.product.costPrice;
            return a + (item.unitPrice - costPrice) * item.quantity;
          }, 0)
        );
      }, 0);

      ventasPorDia.push({
        fecha: diaStart.toISOString().split("T")[0],
        total: totalDia,
        ganancia: gananciaDia,
        numVentas: ventasDia.length,
      });
    }

    return successResponse({
      periodo: {
        type: period,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      resumen: {
        totalVentas,
        totalGanancias,
        totalProductos,
        numTransacciones,
        ticketPromedio,
        margenGanancia,
      },
      comparacion: {
        cambioVentas,
        cambioGanancias,
        cambioTransacciones,
        cambioProductos,
      },
      desglose: {
        ventasPorMetodo,
        ventasPorEstado,
        ventasPorDia,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener resumen de ventas");
  }
}
