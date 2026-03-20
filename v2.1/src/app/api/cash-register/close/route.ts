import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// POST - Cerrar caja actual
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Obtener caja abierta
    const openRegister = await db.cashRegister.findFirst({
      where: { status: "ABIERTA" },
    });

    if (!openRegister) {
      return errorResponse("No hay una caja abierta");
    }

    const body = await request.json();
    const { actualCash, notes } = body;

    if (actualCash === undefined || actualCash === null) {
      return errorResponse("El monto de efectivo real es requerido");
    }

    // Calcular ventas desde la apertura
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

    // Calcular efectivo esperado
    const expectedCash = openRegister.initialCash + summary.cashSales;

    // Calcular diferencia
    const difference = actualCash - expectedCash;

    // Determinar estado
    let status: "CUADRADA" | "DESCUADRADA" = "CUADRADA";
    if (difference !== 0) {
      status = "DESCUADRADA";
    }

    // Actualizar caja
    const closedRegister = await db.cashRegister.update({
      where: { id: openRegister.id },
      data: {
        closingDate: new Date(),
        cashSales: summary.cashSales,
        cardSales: summary.cardSales,
        nequiSales: summary.nequiSales,
        daviplataSales: summary.daviplataSales,
        transferSales: summary.transferSales,
        otherSales: summary.otherSales,
        totalSales: summary.totalSales,
        expectedCash,
        actualCash,
        difference,
        status,
        notes,
        updatedAt: new Date(),
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
        action: "CLOSE_CASH_REGISTER",
        entityType: "CashRegister",
        entityId: closedRegister.id,
        description: `Caja cerrada. Estado: ${status}. Diferencia: ${difference}`,
      },
    });

    return successResponse(closedRegister, "Caja cerrada exitosamente");
  } catch (error) {
    return handleServerError(error, "Error al cerrar caja");
  }
}
