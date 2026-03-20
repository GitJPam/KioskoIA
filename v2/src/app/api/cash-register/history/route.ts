import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  paginatedResponse,
  unauthorizedResponse,
  handleServerError,
  errorResponse,
} from "@/lib/api-helpers";
import { RegisterStatus } from "@prisma/client";

// GET - Listar historial de cierres con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);

    // Parámetros de paginación
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (page < 1 || limit < 1) {
      return errorResponse("Los parámetros de paginación deben ser positivos");
    }

    const skip = (page - 1) * limit;

    // Filtros
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const status = searchParams.get("status") as RegisterStatus | null;

    // Construir filtro
    const where: {
      openingDate?: {
        gte?: Date;
        lte?: Date;
      };
      status?: RegisterStatus;
    } = {};

    if (dateFrom || dateTo) {
      where.openingDate = {};
      if (dateFrom) {
        where.openingDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.openingDate.lte = toDate;
      }
    }

    if (status && ["ABIERTA", "CERRADA", "CUADRADA", "DESCUADRADA"].includes(status)) {
      where.status = status;
    }

    // Obtener total de registros
    const total = await db.cashRegister.count({ where });

    // Obtener registros paginados
    const registers = await db.cashRegister.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        openingDate: "desc",
      },
      skip,
      take: limit,
    });

    // Calcular estadísticas del período (solo si hay filtros de fecha)
    let periodStats = null;
    if (dateFrom || dateTo) {
      const statsWhere = {
        status: { in: ["CUADRADA", "DESCUADRADA"] as RegisterStatus[] },
        ...(where.openingDate && { openingDate: where.openingDate }),
      };

      const stats = await db.cashRegister.aggregate({
        where: statsWhere,
        _count: true,
        _sum: {
          totalSales: true,
          cashSales: true,
          cardSales: true,
          nequiSales: true,
          daviplataSales: true,
          transferSales: true,
          otherSales: true,
          difference: true,
        },
        _avg: {
          difference: true,
        },
      });

      const balancedCount = await db.cashRegister.count({
        where: {
          ...statsWhere,
          status: "CUADRADA",
        },
      });

      periodStats = {
        totalRegisters: stats._count,
        totalSales: stats._sum.totalSales || 0,
        totalByMethod: {
          efectivo: stats._sum.cashSales || 0,
          tarjeta: stats._sum.cardSales || 0,
          nequi: stats._sum.nequiSales || 0,
          daviplata: stats._sum.daviplataSales || 0,
          transferencia: stats._sum.transferSales || 0,
          otro: stats._sum.otherSales || 0,
        },
        totalDifference: stats._sum.difference || 0,
        averageDifference: stats._avg.difference || 0,
        balancedCount,
        unbalancedCount: stats._count - balancedCount,
        balanceRate: stats._count > 0 ? (balancedCount / stats._count) * 100 : 0,
      };
    }

    return paginatedResponse(
      registers.map((reg) => ({
        id: reg.id,
        user: reg.user,
        openingDate: reg.openingDate,
        closingDate: reg.closingDate,
        initialCash: reg.initialCash,
        totalSales: reg.totalSales,
        cashSales: reg.cashSales,
        cardSales: reg.cardSales,
        nequiSales: reg.nequiSales,
        daviplataSales: reg.daviplataSales,
        transferSales: reg.transferSales,
        otherSales: reg.otherSales,
        expectedCash: reg.expectedCash,
        actualCash: reg.actualCash,
        difference: reg.difference,
        status: reg.status,
        notes: reg.notes,
      })),
      page,
      limit,
      total
    );
  } catch (error) {
    return handleServerError(error, "Error al obtener historial de cajas");
  }
}
