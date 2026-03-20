import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Obtener caja actual abierta
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const openRegister = await db.cashRegister.findFirst({
      where: { status: "ABIERTA" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { openingDate: "desc" },
    });

    if (!openRegister) {
      return successResponse(null);
    }

    // Calcular ventas acumuladas desde la apertura
    const sales = await db.sale.findMany({
      where: {
        createdAt: { gte: openRegister.openingDate },
        paymentStatus: "COMPLETADA",
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    });

    // Agrupar por método de pago
    const summary = {
      cashSales: 0,
      cardSales: 0,
      nequiSales: 0,
      daviplataSales: 0,
      transferSales: 0,
      otherSales: 0,
      totalSales: 0,
    };

    for (const sale of sales) {
      summary.totalSales += sale.total;
      switch (sale.paymentMethod) {
        case "EFECTIVO":
          summary.cashSales += sale.total;
          break;
        case "TARJETA":
          summary.cardSales += sale.total;
          break;
        case "NEQUI":
          summary.nequiSales += sale.total;
          break;
        case "DAVIPLATA":
          summary.daviplataSales += sale.total;
          break;
        case "TRANSFERENCIA":
          summary.transferSales += sale.total;
          break;
        default:
          summary.otherSales += sale.total;
      }
    }

    return successResponse({
      ...openRegister,
      ...summary,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener caja");
  }
}

// POST - Abrir nueva caja
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Verificar que no haya una caja abierta
    const openRegister = await db.cashRegister.findFirst({
      where: { status: "ABIERTA" },
    });

    if (openRegister) {
      return errorResponse("Ya existe una caja abierta");
    }

    const body = await request.json();
    const { initialCash, notes } = body;

    const newRegister = await db.cashRegister.create({
      data: {
        userId: user.id,
        initialCash: initialCash || 0,
        notes,
        status: "ABIERTA",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Registrar actividad
    await db.activity.create({
      data: {
        userId: user.id,
        action: "OPEN_CASH_REGISTER",
        entityType: "CashRegister",
        entityId: newRegister.id,
        description: `Caja abierta con monto inicial: ${initialCash || 0}`,
      },
    });

    return successResponse(newRegister, "Caja abierta exitosamente");
  } catch (error) {
    return handleServerError(error, "Error al abrir caja");
  }
}
