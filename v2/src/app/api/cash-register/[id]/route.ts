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
import { RegisterStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Detalle de una caja específica
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const register = await db.cashRegister.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    if (!register) {
      return notFoundResponse("Caja no encontrada");
    }

    // Obtener ventas del período de la caja
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: register.openingDate,
          ...(register.closingDate && { lte: register.closingDate }),
        },
        paymentStatus: "COMPLETADA",
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calcular estadísticas adicionales
    const salesCount = sales.length;
    const itemsSold = sales.reduce(
      (acc, sale) => acc + sale.items.reduce((a, item) => a + item.quantity, 0),
      0
    );
    const averageTicket = salesCount > 0 ? register.totalSales / salesCount : 0;

    return successResponse({
      ...register,
      salesCount,
      itemsSold,
      averageTicket,
      sales: sales.slice(0, 20), // Últimas 20 ventas
      allSales: sales,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener detalle de caja");
  }
}

// PUT - Actualizar notas o corregir valores de una caja
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // Verificar que la caja existe
    const existingRegister = await db.cashRegister.findUnique({
      where: { id },
    });

    if (!existingRegister) {
      return notFoundResponse("Caja no encontrada");
    }

    const body = await request.json();
    const { notes, actualCash, forceRecalculate } = body;

    // Preparar datos a actualizar
    const updateData: {
      notes?: string | null;
      actualCash?: number;
      difference?: number;
      status?: RegisterStatus;
    } = {};

    // Si se proporcionan notas, actualizarlas
    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    // Si se proporciona un nuevo valor de efectivo real, recalcular
    if (actualCash !== undefined && actualCash !== null) {
      if (typeof actualCash !== "number" || actualCash < 0) {
        return errorResponse("El monto de efectivo real debe ser un número positivo");
      }

      // Solo se puede corregir el efectivo real si la caja ya está cerrada
      if (existingRegister.status === "ABIERTA") {
        return errorResponse(
          "No se puede corregir el efectivo de una caja abierta. Ciérrela primero."
        );
      }

      updateData.actualCash = actualCash;
      updateData.difference = actualCash - existingRegister.expectedCash;
      updateData.status = updateData.difference === 0 ? "CUADRADA" : "DESCUADRADA";
    }

    // Si se fuerza el recálculo (por ejemplo, si se agregaron ventas después del cierre)
    if (forceRecalculate) {
      // Recalcular ventas desde la apertura
      const sales = await db.sale.findMany({
        where: {
          createdAt: {
            gte: existingRegister.openingDate,
            ...(existingRegister.closingDate && { lte: existingRegister.closingDate }),
          },
          paymentStatus: "COMPLETADA",
        },
        select: {
          total: true,
          paymentMethod: true,
        },
      });

      const paymentMethodMapping = {
        EFECTIVO: "cashSales",
        TARJETA: "cardSales",
        NEQUI: "nequiSales",
        DAVIPLATA: "daviplataSales",
        TRANSFERENCIA: "transferSales",
        SALDO_PREPAGO: "otherSales",
        CREDITO: "otherSales",
        OTRO: "otherSales",
      } as const;

      const salesByMethod = {
        cashSales: 0,
        cardSales: 0,
        nequiSales: 0,
        daviplataSales: 0,
        transferSales: 0,
        otherSales: 0,
      };

      for (const sale of sales) {
        const field = paymentMethodMapping[sale.paymentMethod];
        salesByMethod[field] += sale.total;
      }

      const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
      const expectedCash = existingRegister.initialCash + salesByMethod.cashSales;

      Object.assign(updateData, {
        cashSales: salesByMethod.cashSales,
        cardSales: salesByMethod.cardSales,
        nequiSales: salesByMethod.nequiSales,
        daviplataSales: salesByMethod.daviplataSales,
        transferSales: salesByMethod.transferSales,
        otherSales: salesByMethod.otherSales,
        totalSales,
        expectedCash,
        difference: (existingRegister.actualCash || 0) - expectedCash,
        status: (existingRegister.actualCash || 0) - expectedCash === 0 ? "CUADRADA" : "DESCUADRADA",
      });
    }

    // Si no hay nada que actualizar
    if (Object.keys(updateData).length === 0) {
      return errorResponse("No se proporcionaron datos para actualizar");
    }

    // Actualizar la caja
    const updatedRegister = await db.cashRegister.update({
      where: { id },
      data: updateData,
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
        action: "UPDATE_CASH_REGISTER",
        entityType: "CashRegister",
        entityId: id,
        description: `Caja actualizada: ${Object.keys(updateData).join(", ")}`,
        metadata: JSON.stringify(updateData),
      },
    });

    return successResponse(
      updatedRegister,
      "Caja actualizada exitosamente"
    );
  } catch (error) {
    return handleServerError(error, "Error al actualizar caja");
  }
}
