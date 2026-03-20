import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "@/lib/api-helpers";

// GET - Reporte de Ganancias y Pérdidas
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const period = searchParams.get("period") || "month"; // month, quarter, year, custom

    // Determinar rango de fechas
    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      startDate = startOfDay(new Date(from));
      endDate = endOfDay(new Date(to));
    } else {
      switch (period) {
        case "quarter": {
          const now = new Date();
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          startDate = startOfDay(startDate);
          endDate = endOfDay(now);
          break;
        }
        case "year": {
          const now = new Date();
          startDate = new Date(now.getFullYear(), 0, 1);
          startDate = startOfDay(startDate);
          endDate = endOfDay(now);
          break;
        }
        default: {
          startDate = startOfMonth();
          endDate = endOfMonth();
        }
      }
    }

    // ============================================
    // INGRESOS
    // ============================================

    // Ventas completadas
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

    // Calcular ingresos
    const ingresosBrutos = sales.reduce((acc, sale) => acc + sale.total, 0);
    const descuentos = sales.reduce((acc, sale) => acc + sale.discount, 0);
    const ingresosNetos = ingresosBrutos - descuentos;

    // ============================================
    // COSTOS
    // ============================================

    // Costo de productos vendidos
    const costoVentas = sales.reduce((acc, sale) => {
      return (
        acc +
        sale.items.reduce((a, item) => {
          const costPrice = item.costPrice || item.product.costPrice;
          return a + costPrice * item.quantity;
        }, 0)
      );
    }, 0);

    // Compras a proveedores en el período
    const purchaseOrders = await db.purchaseOrder.findMany({
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["RECIBIDO_PARCIAL", "RECIBIDO_COMPLETO"],
        },
      },
    });

    const totalCompras = purchaseOrders.reduce((acc, po) => acc + po.total, 0);

    // ============================================
    // GANANCIAS
    // ============================================

    const gananciaBruta = ingresosNetos - costoVentas;
    const margenBruto = ingresosNetos > 0 ? (gananciaBruta / ingresosNetos) * 100 : 0;

    // ============================================
    // DESGLOSE POR CATEGORÍA
    // ============================================

    const categoryBreakdown = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categoryColor: string;
        ingresos: number;
        costos: number;
        ganancia: number;
        numVentas: number;
        productos: number;
      }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const cat = item.product.category;
        const costPrice = item.costPrice || item.product.costPrice;
        const existing = categoryBreakdown.get(cat.id);

        if (existing) {
          existing.ingresos += item.subtotal;
          existing.costos += costPrice * item.quantity;
          existing.ganancia += (item.unitPrice - costPrice) * item.quantity;
          existing.productos += item.quantity;
        } else {
          categoryBreakdown.set(cat.id, {
            categoryId: cat.id,
            categoryName: cat.name,
            categoryColor: cat.color,
            ingresos: item.subtotal,
            costos: costPrice * item.quantity,
            ganancia: (item.unitPrice - costPrice) * item.quantity,
            numVentas: 1,
            productos: item.quantity,
          });
        }
      }
    }

    const desglosePorCategoria = Array.from(categoryBreakdown.values())
      .map((cat) => ({
        ...cat,
        margen: cat.ingresos > 0 ? (cat.ganancia / cat.ingresos) * 100 : 0,
      }))
      .sort((a, b) => b.ganancia - a.ganancia);

    // ============================================
    // DESGLOSE POR MÉTODO DE PAGO
    // ============================================

    const paymentMethodBreakdown = sales.reduce(
      (acc, sale) => {
        const metodo = sale.paymentMethod;
        if (!acc[metodo]) {
          acc[metodo] = {
            metodo,
            ingresos: 0,
            numVentas: 0,
            ganancia: 0,
          };
        }
        acc[metodo].ingresos += sale.total;
        acc[metodo].numVentas += 1;
        acc[metodo].ganancia += sale.items.reduce((a, item) => {
          const costPrice = item.costPrice || item.product.costPrice;
          return a + (item.unitPrice - costPrice) * item.quantity;
        }, 0);
        return acc;
      },
      {} as Record<string, { metodo: string; ingresos: number; numVentas: number; ganancia: number }>
    );

    const desglosePorMetodoPago = Object.values(paymentMethodBreakdown)
      .map((m) => ({
        ...m,
        porcentaje: ingresosNetos > 0 ? (m.ingresos / ingresosNetos) * 100 : 0,
      }))
      .sort((a, b) => b.ingresos - a.ingresos);

    // ============================================
    // PRODUCTOS CON PÉRDIDAS O BAJA MARGEN
    // ============================================

    const productPerformance = new Map<
      string,
      {
        productId: string;
        productName: string;
        categoryName: string;
        ingresos: number;
        costos: number;
        ganancia: number;
        margen: number;
        cantidad: number;
      }
    >();

    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productPerformance.get(item.productId);
        const costPrice = item.costPrice || item.product.costPrice;
        const itemGanancia = (item.unitPrice - costPrice) * item.quantity;

        if (existing) {
          existing.ingresos += item.subtotal;
          existing.costos += costPrice * item.quantity;
          existing.ganancia += itemGanancia;
          existing.cantidad += item.quantity;
          existing.margen = existing.ingresos > 0 ? (existing.ganancia / existing.ingresos) * 100 : 0;
        } else {
          productPerformance.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            categoryName: item.product.category.name,
            ingresos: item.subtotal,
            costos: costPrice * item.quantity,
            ganancia: itemGanancia,
            margen: item.subtotal > 0 ? (itemGanancia / item.subtotal) * 100 : 0,
            cantidad: item.quantity,
          });
        }
      }
    }

    // Productos con pérdida o margen muy bajo (< 10%)
    const productosBajoRendimiento = Array.from(productPerformance.values())
      .filter((p) => p.margen < 10)
      .sort((a, b) => a.margen - b.margen);

    // Top productos por ganancia
    const topProductosGanancia = Array.from(productPerformance.values())
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 10);

    // ============================================
    // COMPARACIÓN CON PERÍODO ANTERIOR
    // ============================================

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
        items: true,
      },
    });

    const previousIngresos = previousSales.reduce((acc, s) => acc + s.total, 0);
    const previousCostos = previousSales.reduce((acc, sale) => {
      return (
        acc +
        sale.items.reduce((a, item) => {
          return a + (item.costPrice || 0) * item.quantity;
        }, 0)
      );
    }, 0);
    const previousGanancia = previousIngresos - previousCostos;

    const cambioIngresos =
      previousIngresos > 0
        ? ((ingresosNetos - previousIngresos) / previousIngresos) * 100
        : 0;
    const cambioCostos =
      previousCostos > 0 ? ((costoVentas - previousCostos) / previousCostos) * 100 : 0;
    const cambioGanancia =
      previousGanancia > 0
        ? ((gananciaBruta - previousGanancia) / previousGanancia) * 100
        : 0;

    // ============================================
    // CRÉDITOS/FIADOS
    // ============================================

    const creditSales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        isCredit: true,
      },
    });

    const totalCredito = creditSales.reduce((acc, s) => acc + s.total, 0);

    // Pagos de créditos recibidos
    const creditPayments = await db.creditPayment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const pagosCreditoRecibidos = creditPayments.reduce((acc, p) => acc + p.amount, 0);

    return successResponse({
      periodo: {
        type: period,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      resumen: {
        ingresos: {
          brutos: ingresosBrutos,
          descuentos,
          netos: ingresosNetos,
        },
        costos: {
          ventas: costoVentas,
          compras: totalCompras,
        },
        ganancia: {
          bruta: gananciaBruta,
          margen: margenBruto,
        },
        credito: {
          ventasCredito: totalCredito,
          pagosRecibidos: pagosCreditoRecibidos,
        },
      },
      comparacion: {
        ingresos: cambioIngresos,
        costos: cambioCostos,
        ganancia: cambioGanancia,
      },
      desglosePorCategoria,
      desglosePorMetodoPago,
      topProductosGanancia,
      productosBajoRendimiento,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener reporte de ganancias");
  }
}
