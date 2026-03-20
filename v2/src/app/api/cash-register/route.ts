import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Obtener caja actual abierta
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Buscar caja abierta
    const openRegister = await db.cashRegister.findFirst({
      where: {
        status: "ABIERTA",
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
      orderBy: {
        openingDate: "desc",
      },
    });

    if (!openRegister) {
      return successResponse(null, "No hay caja abierta");
    }

    return successResponse(openRegister);
  } catch (error) {
    return handleServerError(error, "Error al obtener caja actual");
  }
}

// POST - Abrir nueva caja
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { initialCash, notes } = body;

    // Validar monto inicial
    if (initialCash === undefined || initialCash === null) {
      return errorResponse("El monto inicial es requerido");
    }

    if (typeof initialCash !== "number" || initialCash < 0) {
      return errorResponse("El monto inicial debe ser un número positivo");
    }

    // Verificar que no haya una caja abierta
    const existingOpenRegister = await db.cashRegister.findFirst({
      where: {
        status: "ABIERTA",
      },
    });

    if (existingOpenRegister) {
      return errorResponse(
        "Ya existe una caja abierta. Debe cerrar la caja actual antes de abrir una nueva."
      );
    }

    // Crear nueva caja
    const newRegister = await db.cashRegister.create({
      data: {
        userId: user.id,
        initialCash,
        notes: notes || null,
        status: "ABIERTA",
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
        action: "OPEN_CASH_REGISTER",
        entityType: "CashRegister",
        entityId: newRegister.id,
        description: `Caja abierta con monto inicial: ${initialCash}`,
        metadata: JSON.stringify({ initialCash }),
      },
    });

    return successResponse(
      newRegister,
      "Caja abierta exitosamente",
      201
    );
  } catch (error) {
    return handleServerError(error, "Error al abrir caja");
  }
}
