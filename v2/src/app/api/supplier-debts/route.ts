import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  paginatedResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Listar deudas de proveedores con filtros
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status");
    const overdue = searchParams.get("overdue");
    const includePaid = searchParams.get("includePaid") === "true";

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (status) {
      where.status = status;
    } else if (!includePaid) {
      // Por defecto, excluir deudas pagadas
      where.status = { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] };
    }

    // Filtro para deudas vencidas
    if (overdue === "true") {
      const now = new Date();
      where.dueDate = { lt: now };
      where.status = { in: ["PENDIENTE", "PARCIAL"] };
    }

    // Obtener deudas
    const [debts, total] = await Promise.all([
      db.supplierDebt.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          purchaseOrder: {
            select: {
              orderNumber: true,
              total: true,
            },
          },
        },
        orderBy: [
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      db.supplierDebt.count({ where }),
    ]);

    // Calcular totales y verificar vencimiento
    const now = new Date();
    const debtsWithStatus = debts.map((debt) => {
      const isOverdue = debt.dueDate && new Date(debt.dueDate) < now && debt.status !== "PAGADO";

      return {
        ...debt,
        isOverdue,
        daysOverdue: isOverdue && debt.dueDate
          ? Math.floor((now.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      };
    });

    // Calcular estadísticas generales
    const stats = await db.supplierDebt.aggregate({
      where: {
        status: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
      },
      _sum: {
        amount: true,
        paidAmount: true,
        pendingAmount: true,
      },
      _count: true,
    });

    // Contar deudas vencidas
    const overdueCount = await db.supplierDebt.count({
      where: {
        status: { in: ["PENDIENTE", "PARCIAL"] },
        dueDate: { lt: now },
      },
    });

    const overdueSum = await db.supplierDebt.aggregate({
      where: {
        status: { in: ["PENDIENTE", "PARCIAL"] },
        dueDate: { lt: now },
      },
      _sum: {
        pendingAmount: true,
      },
    });

    return paginatedResponse(debtsWithStatus, page, limit, total, {
      stats: {
        totalDebts: stats._count,
        totalAmount: stats._sum.amount || 0,
        totalPaid: stats._sum.paidAmount || 0,
        totalPending: stats._sum.pendingAmount || 0,
        overdueCount,
        overdueAmount: overdueSum._sum.pendingAmount || 0,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al listar deudas de proveedores");
  }
}

// Helper para crear respuesta paginada con metadatos adicionales
function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Record<string, unknown>
) {
  const totalPages = Math.ceil(total / limit);

  return Response.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    meta,
  });
}
