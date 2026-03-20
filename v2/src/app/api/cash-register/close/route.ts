import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
  notFoundResponse,
} from "@/lib/api-helpers";
import { PaymentMethod } from "@prisma/client";

// Mapeo de métodos de pago a campos de la caja
const paymentMethodMapping: Record<PaymentMethod, keyof typeof salesFields> = {
  EFECTIVO: "cashSales",
  TARJETA: "cardSales",
  NEQUI: "nequiSales",
  DAVIPLATA: "daviplataSales",
  TRANSFERENCIA: "transferSales",
  SALDO_PREPAGO: "otherSales",
  CREDITO: "otherSales",
  OTRO: "otherSales",
};

const salesFields = {
  cashSales: 0,
  cardSales: 0,
  nequiSales: 0,
  daviplataSales: 0,
  transferSales: 0,
  otherSales: 0,
};

// POST - Cerrar caja actual
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { actualCash, notes } = body;

    // Validar efectivo real
    if (actualCash === undefined || actualCash === null) {
      return errorResponse("El monto de efectivo real es requerido");
    }

    if (typeof actualCash !== "number" || actualCash < 0) {
      return errorResponse("El monto de efectivo real debe ser un número positivo");
    }

    // Buscar caja abierta
    const openRegister = await db.cashRegister.findFirst({
      where: {
        status: "ABIERTA",
      },
    });

    if (!openRegister) {
      return notFoundResponse("No hay una caja abierta para cerrar");
    }

    // Obtener ventas realizadas desde la apertura de la caja
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: openRegister.openingDate,
        },
        paymentStatus: "COMPLETADA",
      },
      select: {
        total: true,
        paymentMethod: true,
      },
    });

    // Calcular ventas por método de pago
    const salesByMethod = { ...salesFields };

    for (const sale of sales) {
      const field = paymentMethodMapping[sale.paymentMethod];
      salesByMethod[field] += sale.total;
    }

    // Calcular total de ventas
    const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);

    // Obtener pagos de fiados recibidos (totalInPayments)
    const creditPayments = await db.creditPayment.aggregate({
      where: {
        createdAt: {
          gte: openRegister.openingDate,
        },
      },
      _sum: {
        amount: true,
      },
    });
    const totalInPayments = creditPayments._sum.amount || 0;

    // Por ahora, totalOutPayments (pagos a proveedores) se deja en 0
    // ya que no hay un modelo de pagos a proveedores implementado
    const totalOutPayments = 0;

    // Calcular efectivo esperado
    // Efectivo inicial + Ventas en efectivo + Pagos de fiados en efectivo - Pagos a proveedores en efectivo
    // Por simplicidad: efectivo inicial + ventas en efectivo
    const expectedCash = openRegister.initialCash + salesByMethod.cashSales;

    // Calcular diferencia
    const difference = actualCash - expectedCash;

    // Determinar estado: CUADRADA si diferencia = 0, DESCUADRADA si no
    const status = difference === 0 ? "CUADRADA" : "DESCUADRADA";

    // Actualizar la caja
    const closedRegister = await db.cashRegister.update({
      where: {
        id: openRegister.id,
      },
      data: {
        closingDate: new Date(),
        cashSales: salesByMethod.cashSales,
        cardSales: salesByMethod.cardSales,
        nequiSales: salesByMethod.nequiSales,
        daviplataSales: salesByMethod.daviplataSales,
        transferSales: salesByMethod.transferSales,
        otherSales: salesByMethod.otherSales,
        totalSales,
        totalInPayments,
        totalOutPayments,
        expectedCash,
        actualCash,
        difference,
        notes: notes || openRegister.notes,
        status,
      },
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
    });

    // Registrar actividad
    await db.activity.create({
      data: {
        userId: user.id,
        action: "CLOSE_CASH_REGISTER",
        entityType: "CashRegister",
        entityId: closedRegister.id,
        description: `Caja cerrada. Estado: ${status}. Diferencia: ${difference}`,
        metadata: JSON.stringify({
          expectedCash,
          actualCash,
          difference,
          status,
          totalSales,
        }),
      },
    });

    return successResponse(
      {
        ...closedRegister,
        summary: {
          openingDate: closedRegister.openingDate,
          closingDate: closedRegister.closingDate,
          initialCash: closedRegister.initialCash,
          salesByMethod: {
            efectivo: salesByMethod.cashSales,
            tarjeta: salesByMethod.cardSales,
            nequi: salesByMethod.nequiSales,
            daviplata: salesByMethod.daviplataSales,
            transferencia: salesByMethod.transferSales,
            otro: salesByMethod.otherSales,
          },
          totalSales,
          expectedCash,
          actualCash,
          difference,
          isBalanced: status === "CUADRADA",
        },
      },
      `Caja cerrada exitosamente. Estado: ${status}`
    );
  } catch (error) {
    return handleServerError(error, "Error al cerrar caja");
  }
}
