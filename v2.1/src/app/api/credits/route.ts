import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Listar todos los créditos/fiados
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status"); // pendiente, pagado, all
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {
      isCredit: true,
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (status === "pendiente") {
      where.paymentStatus = { in: ["PENDIENTE", "FIADO"] };
    } else if (status === "pagado") {
      where.paymentStatus = "COMPLETADA";
    }
    // Si status es "all" o no se especifica, traer todos

    const [credits, total] = await Promise.all([
      db.sale.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
          creditPayments: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.sale.count({ where }),
    ]);

    const now = new Date();
    const creditsWithStatus = credits.map((credit) => {
      const totalPaid = credit.creditPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      const pendingAmount = credit.total - totalPaid;

      let creditStatus = "PENDIENTE";
      if (pendingAmount <= 0) {
        creditStatus = "PAGADO";
      } else if (
        credit.creditDueDate &&
        new Date(credit.creditDueDate) < now
      ) {
        creditStatus = "VENCIDO";
      }

      return {
        id: credit.id,
        invoiceNumber: credit.invoiceNumber,
        customer: credit.customer,
        total: credit.total,
        paidAmount: totalPaid,
        pendingAmount,
        createdAt: credit.createdAt,
        creditDueDate: credit.creditDueDate,
        status: creditStatus,
        items: credit.items,
      };
    });

    // Estadísticas
    const stats = await db.sale.aggregate({
      where: { isCredit: true, paymentStatus: { in: ["PENDIENTE", "FIADO"] } },
      _sum: { total: true },
      _count: true,
    });

    const overdueCount = creditsWithStatus.filter(
      (c) => c.status === "VENCIDO"
    ).length;

    const totalPages = Math.ceil(total / limit);

    return Response.json({
      success: true,
      data: creditsWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        totalCredits: stats._count,
        totalAmount: stats._sum.total || 0,
        overdueCount,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al listar créditos");
  }
}
