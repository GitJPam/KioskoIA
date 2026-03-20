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

// Función helper para obtener el inicio y fin de un año
function startOfYear(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfYear(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setMonth(11, 31);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Función helper para obtener el número de semana
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// GET - Ventas agrupadas por período
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "day"; // day, week, month
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Determinar rango de fechas
    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      startDate = startOfDay(new Date(from));
      endDate = endOfDay(new Date(to));
    } else {
      // Por defecto, último mes
      const now = new Date();
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = startOfDay(startDate);
      endDate = endOfDay(now);
    }

    // Obtener ventas del rango
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
      orderBy: {
        createdAt: "asc",
      },
    });

    // Agrupar ventas según el período
    const groupedData: Map<
      string,
      {
        fecha: string;
        fechaFin?: string;
        label: string;
        total: number;
        ganancia: number;
        numVentas: number;
        productos: number;
      }
    > = new Map();

    for (const sale of sales) {
      const saleDate = new Date(sale.createdAt);
      let key: string;
      let label: string;
      let fechaFin: string | undefined;

      switch (period) {
        case "week": {
          // Agrupar por semana
          const weekNum = getWeekNumber(saleDate);
          const year = saleDate.getFullYear();
          key = `${year}-W${String(weekNum).padStart(2, "0")}`;
          label = `Semana ${weekNum} de ${year}`;
          
          // Calcular inicio y fin de semana
          const dayOfWeek = saleDate.getDay();
          const weekStart = new Date(saleDate);
          weekStart.setDate(saleDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          fechaFin = endOfDay(weekEnd).toISOString();
          break;
        }
        case "month": {
          // Agrupar por mes
          const month = saleDate.getMonth() + 1;
          const year = saleDate.getFullYear();
          key = `${year}-${String(month).padStart(2, "0")}`;
          label = new Intl.DateTimeFormat("es-CO", {
            month: "long",
            year: "numeric",
          }).format(saleDate);
          break;
        }
        default: {
          // Agrupar por día
          key = saleDate.toISOString().split("T")[0];
          label = new Intl.DateTimeFormat("es-CO", {
            weekday: "short",
            day: "numeric",
            month: "short",
          }).format(saleDate);
        }
      }

      // Calcular ganancia de esta venta
      const saleGanancia = sale.items.reduce((acc, item) => {
        const costPrice = item.costPrice || item.product.costPrice;
        return acc + (item.unitPrice - costPrice) * item.quantity;
      }, 0);

      const saleProductos = sale.items.reduce(
        (acc, item) => acc + item.quantity,
        0
      );

      const existing = groupedData.get(key);
      if (existing) {
        existing.total += sale.total;
        existing.ganancia += saleGanancia;
        existing.numVentas += 1;
        existing.productos += saleProductos;
      } else {
        groupedData.set(key, {
          fecha: startOfDay(saleDate).toISOString(),
          fechaFin,
          label,
          total: sale.total,
          ganancia: saleGanancia,
          numVentas: 1,
          productos: saleProductos,
        });
      }
    }

    // Convertir a array y ordenar por fecha
    const data = Array.from(groupedData.values()).sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    // Calcular totales
    const totalGeneral = data.reduce((acc, d) => acc + d.total, 0);
    const gananciaGeneral = data.reduce((acc, d) => acc + d.ganancia, 0);
    const ventasGeneral = data.reduce((acc, d) => acc + d.numVentas, 0);
    const productosGeneral = data.reduce((acc, d) => acc + d.productos, 0);

    // Calcular promedios
    const promedioVentas = data.length > 0 ? totalGeneral / data.length : 0;
    const promedioGanancia = data.length > 0 ? gananciaGeneral / data.length : 0;
    const promedioTransacciones =
      data.length > 0 ? ventasGeneral / data.length : 0;

    // Encontrar mejor y peor día/semana/mes
    let mejor: (typeof data)[0] | null = null;
    let peor: (typeof data)[0] | null = null;

    if (data.length > 0) {
      mejor = data.reduce((max, d) => (d.total > max.total ? d : max), data[0]);
      peor = data.reduce((min, d) => (d.total < min.total ? d : min), data[0]);
    }

    // Tendencia (comparar primera y segunda mitad)
    const mitad = Math.floor(data.length / 2);
    const primeraMitad = data.slice(0, mitad);
    const segundaMitad = data.slice(mitad);

    const totalPrimeraMitad = primeraMitad.reduce((acc, d) => acc + d.total, 0);
    const totalSegundaMitad = segundaMitad.reduce((acc, d) => acc + d.total, 0);

    const tendencia =
      totalPrimeraMitad > 0
        ? ((totalSegundaMitad - totalPrimeraMitad) / totalPrimeraMitad) * 100
        : 0;

    return successResponse({
      periodo: {
        type: period,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      data,
      resumen: {
        total: totalGeneral,
        ganancia: gananciaGeneral,
        numVentas: ventasGeneral,
        productos: productosGeneral,
        promedioVentas,
        promedioGanancia,
        promedioTransacciones,
      },
      analisis: {
        mejor,
        peor,
        tendencia,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener ventas por período");
  }
}
