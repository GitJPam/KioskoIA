import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  unauthorizedResponse,
  handleServerError,
  startOfDay,
  endOfDay,
} from "@/lib/api-helpers";

// Función para convertir datos a CSV
function toCSV(data: Record<string, unknown>[], headers: Record<string, string>): string {
  if (data.length === 0) return "";

  const headerKeys = Object.keys(headers);
  const headerRow = headerKeys.map((key) => headers[key]).join(",");

  const dataRows = data.map((item) =>
    headerKeys
      .map((key) => {
        const value = item[key];
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

// GET - Exportar reportes
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales"; // sales, products, profits
    const format = searchParams.get("format") || "json"; // csv, json
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Determinar rango de fechas
    const startDate = from ? startOfDay(new Date(from)) : startOfDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = to ? endOfDay(new Date(to)) : endOfDay(new Date());

    let data: Record<string, unknown>[] = [];
    let filename = `reporte_${type}_${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}`;
    let headers: Record<string, string> = {};

    switch (type) {
      case "sales": {
        // Exportar ventas detalladas
        const sales = await db.sale.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            items: {
              include: {
                product: {
                  include: { category: true },
                },
              },
            },
            customer: true,
            user: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        // Aplanar ventas con items
        data = sales.flatMap((sale) =>
          sale.items.map((item) => ({
            fecha: new Date(sale.createdAt).toISOString().split("T")[0],
            hora: new Date(sale.createdAt).toTimeString().split(" ")[0],
            factura: sale.invoiceNumber,
            vendedor: sale.user.name,
            cliente: sale.customerName || sale.customer?.name || "",
            producto: item.product.name,
            categoria: item.product.category.name,
            cantidad: item.quantity,
            precioUnitario: item.unitPrice,
            subtotal: item.subtotal,
            descuento: item.discount,
            costoUnitario: item.costPrice || item.product.costPrice,
            ganancia: (item.unitPrice - (item.costPrice || item.product.costPrice)) * item.quantity,
            metodoPago: sale.paymentMethod,
            estado: sale.paymentStatus,
            esCredito: sale.isCredit ? "Sí" : "No",
          }))
        );

        // Si no hay items, mostrar resumen de ventas
        if (data.length === 0) {
          data = sales.map((sale) => ({
            fecha: new Date(sale.createdAt).toISOString().split("T")[0],
            hora: new Date(sale.createdAt).toTimeString().split(" ")[0],
            factura: sale.invoiceNumber,
            vendedor: sale.user.name,
            cliente: sale.customerName || sale.customer?.name || "",
            total: sale.total,
            subtotal: sale.subtotal,
            descuento: sale.discount,
            metodoPago: sale.paymentMethod,
            estado: sale.paymentStatus,
            esCredito: sale.isCredit ? "Sí" : "No",
          }));
        }

        headers = {
          fecha: "Fecha",
          hora: "Hora",
          factura: "Factura",
          vendedor: "Vendedor",
          cliente: "Cliente",
          producto: "Producto",
          categoria: "Categoría",
          cantidad: "Cantidad",
          precioUnitario: "Precio Unitario",
          subtotal: "Subtotal",
          descuento: "Descuento",
          costoUnitario: "Costo Unitario",
          ganancia: "Ganancia",
          metodoPago: "Método de Pago",
          estado: "Estado",
          esCredito: "Es Crédito",
        };
        break;
      }

      case "products": {
        // Exportar productos más vendidos
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

        const productStats = new Map<
          string,
          {
            producto: string;
            sku: string;
            categoria: string;
            cantidadVendida: number;
            ingresos: number;
            costos: number;
            ganancia: number;
            margen: number;
            precioPromedio: number;
            numVentas: number;
          }
        >();

        for (const sale of sales) {
          for (const item of sale.items) {
            const existing = productStats.get(item.productId);
            const costPrice = item.costPrice || item.product.costPrice;

            if (existing) {
              existing.cantidadVendida += item.quantity;
              existing.ingresos += item.subtotal;
              existing.costos += costPrice * item.quantity;
              existing.ganancia += (item.unitPrice - costPrice) * item.quantity;
              existing.numVentas += 1;
              existing.precioPromedio = existing.ingresos / existing.cantidadVendida;
              existing.margen = existing.ingresos > 0 ? (existing.ganancia / existing.ingresos) * 100 : 0;
            } else {
              const ganancia = (item.unitPrice - costPrice) * item.quantity;
              productStats.set(item.productId, {
                producto: item.product.name,
                sku: item.product.sku || "",
                categoria: item.product.category.name,
                cantidadVendida: item.quantity,
                ingresos: item.subtotal,
                costos: costPrice * item.quantity,
                ganancia,
                margen: item.subtotal > 0 ? (ganancia / item.subtotal) * 100 : 0,
                precioPromedio: item.unitPrice,
                numVentas: 1,
              });
            }
          }
        }

        data = Array.from(productStats.values()).sort((a, b) => b.ingresos - a.ingresos);

        headers = {
          producto: "Producto",
          sku: "SKU",
          categoria: "Categoría",
          cantidadVendida: "Cantidad Vendida",
          ingresos: "Ingresos",
          costos: "Costos",
          ganancia: "Ganancia",
          margen: "Margen (%)",
          precioPromedio: "Precio Promedio",
          numVentas: "Número de Ventas",
        };
        break;
      }

      case "profits": {
        // Exportar resumen de ganancias
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
          orderBy: { createdAt: "asc" },
        });

        // Agrupar por día
        const dailyStats = new Map<
          string,
          {
            fecha: string;
            ventas: number;
            ingresos: number;
            costos: number;
            ganancia: number;
            descuentos: number;
            margen: number;
          }
        >();

        for (const sale of sales) {
          const dateKey = new Date(sale.createdAt).toISOString().split("T")[0];
          const existing = dailyStats.get(dateKey);

          const saleCost = sale.items.reduce((acc, item) => {
            const costPrice = item.costPrice || item.product.costPrice;
            return acc + costPrice * item.quantity;
          }, 0);

          const saleProfit = sale.total - saleCost;

          if (existing) {
            existing.ventas += 1;
            existing.ingresos += sale.total;
            existing.costos += saleCost;
            existing.ganancia += saleProfit;
            existing.descuentos += sale.discount;
            existing.margen = existing.ingresos > 0 ? (existing.ganancia / existing.ingresos) * 100 : 0;
          } else {
            dailyStats.set(dateKey, {
              fecha: dateKey,
              ventas: 1,
              ingresos: sale.total,
              costos: saleCost,
              ganancia: saleProfit,
              descuentos: sale.discount,
              margen: sale.total > 0 ? (saleProfit / sale.total) * 100 : 0,
            });
          }
        }

        data = Array.from(dailyStats.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

        // Agregar fila de totales
        const totales = {
          fecha: "TOTALES",
          ventas: data.reduce((acc, d) => acc + d.ventas, 0),
          ingresos: data.reduce((acc, d) => acc + d.ingresos, 0),
          costos: data.reduce((acc, d) => acc + d.costos, 0),
          ganancia: data.reduce((acc, d) => acc + d.ganancia, 0),
          descuentos: data.reduce((acc, d) => acc + d.descuentos, 0),
          margen: 0,
        };
        totales.margen = totales.ingresos > 0 ? (totales.ganancia / totales.ingresos) * 100 : 0;

        data.push(totales);

        headers = {
          fecha: "Fecha",
          ventas: "Ventas",
          ingresos: "Ingresos",
          costos: "Costos",
          ganancia: "Ganancia",
          descuentos: "Descuentos",
          margen: "Margen (%)",
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: "Tipo de reporte no válido" },
          { status: 400 }
        );
    }

    // Generar respuesta según formato
    if (format === "csv") {
      const csv = toCSV(data, headers);
      const bom = "\uFEFF"; // BOM for Excel UTF-8 compatibility

      return new NextResponse(bom + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // JSON
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }
  } catch (error) {
    return handleServerError(error, "Error al exportar reporte");
  }
}
