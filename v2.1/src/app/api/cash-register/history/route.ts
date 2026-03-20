import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Historial de cierres de caja
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.openingDate = {};
      if (dateFrom) {
        where.openingDate = { ...where.openingDate, gte: new Date(dateFrom) };
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.openingDate = { ...where.openingDate, lte: endDate };
      }
    }

    const [registers, total] = await Promise.all([
      db.cashRegister.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { openingDate: "desc" },
        skip,
        take: limit,
      }),
      db.cashRegister.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return Response.json({
      success: true,
      data: registers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener historial");
  }
}
