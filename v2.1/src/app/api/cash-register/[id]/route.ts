import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Detalle de una caja específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!register) {
      return notFoundResponse("Caja no encontrada");
    }

    // Obtener ventas del período
    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: register.openingDate,
          lte: register.closingDate || new Date(),
        },
        paymentStatus: "COMPLETADA",
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calcular estadísticas
    const salesCount = sales.length;
    const itemsSold = sales.reduce(
      (acc, sale) => acc + sale.items.reduce((sum, item) => sum + item.quantity, 0),
      0
    );
    const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
    const averageTicket = salesCount > 0 ? totalSales / salesCount : 0;

    return successResponse({
      ...register,
      salesCount,
      itemsSold,
      averageTicket,
      sales: sales.slice(0, 10), // Últimas 10 ventas
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener detalle de caja");
  }
}

// PUT - Actualizar caja (corregir valores)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    const { notes, actualCash, forceRecalculate } = body;

    const register = await db.cashRegister.findUnique({
      where: { id },
    });

    if (!register) {
      return notFoundResponse("Caja no encontrada");
    }

    // No permitir modificar cajas abiertas
    if (register.status === "ABIERTA") {
      return Response.json(
        { success: false, error: "No se puede modificar una caja abierta" },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown> = { notes };

    // Si se solicita recalcular o se proporciona nuevo valor de efectivo
    if (forceRecalculate || actualCash !== undefined) {
      const newActualCash = actualCash ?? register.actualCash;
      const difference = newActualCash - (register.expectedCash || 0);

      updateData = {
        ...updateData,
        actualCash: newActualCash,
        difference,
        status: difference === 0 ? "CUADRADA" : "DESCUADRADA",
      };
    }

    const updatedRegister = await db.cashRegister.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return successResponse(updatedRegister, "Caja actualizada");
  } catch (error) {
    return handleServerError(error, "Error al actualizar caja");
  }
}
