import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
  paginatedResponse,
} from "@/lib/api-helpers";

// GET - Listar todos los créditos pendientes
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status"); // "pendiente", "pagado", "all"

    const skip = (page - 1) * limit;

    // Construir filtros para ventas a crédito
    const where: any = {
      isCredit: true,
    };

    if (customerId) {
      where.customerId = customerId;
    }

    // Filtro por estado
    if (status === "pendiente") {
      where.paymentStatus = { in: ["PENDIENTE", "FIADO"] };
    } else if (status === "pagado") {
      where.paymentStatus = "COMPLETADA";
    }
    // Si es "all" o no se especifica, traer todos

    // Obtener total de registros
    const total = await db.sale.count({ where });

    // Obtener ventas a crédito con información del cliente
    const creditSales = await db.sale.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            creditLimit: true,
          },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Calcular saldo pendiente de cada venta
    const creditsWithBalance = await Promise.all(
      creditSales.map(async (sale) => {
        // Obtener pagos de esta venta
        const payments = await db.creditPayment.aggregate({
          where: { saleId: sale.id },
          _sum: { amount: true },
        });

        const paidAmount = payments._sum.amount || 0;
        const pendingAmount = sale.total - paidAmount;

        // Determinar estado del crédito
        let creditStatus: "PENDIENTE" | "PAGADO" | "VENCIDO" = "PENDIENTE";
        if (pendingAmount <= 0) {
          creditStatus = "PAGADO";
        } else if (sale.creditDueDate && new Date(sale.creditDueDate) < new Date()) {
          creditStatus = "VENCIDO";
        }

        return {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          customer: sale.customer,
          total: sale.total,
          paidAmount,
          pendingAmount,
          creditStatus,
          createdAt: sale.createdAt,
          creditDueDate: sale.creditDueDate,
          paymentStatus: sale.paymentStatus,
          notes: sale.notes,
          items: sale.items.map((item) => ({
            id: item.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        };
      })
    );

    return paginatedResponse(creditsWithBalance, page, limit, total);
  } catch (error) {
    return handleServerError(error, "Error al listar créditos");
  }
}
