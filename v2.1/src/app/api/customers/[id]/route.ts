import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Detalle de cliente
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

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        sales: {
          where: { isCredit: true },
          include: {
            items: {
              include: {
                product: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        creditPayments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return notFoundResponse("Cliente no encontrado");
    }

    // Calcular saldos
    const totalCredit = customer.sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalPaid = customer.creditPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingBalance = totalCredit - totalPaid;
    const creditAvailable = customer.creditLimit - pendingBalance;

    // Ventas pendientes
    const pendingSales = customer.sales.filter(
      (sale) => sale.paymentStatus === "PENDIENTE" || sale.paymentStatus === "FIADO"
    );

    return successResponse({
      ...customer,
      pendingBalance,
      creditAvailable: Math.max(0, creditAvailable),
      isOverLimit: pendingBalance > customer.creditLimit,
      pendingSales,
      totalCredit,
      totalPaid,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener cliente");
  }
}

// PUT - Actualizar cliente
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
    const { name, phone, email, address, notes, creditLimit, isActive } = body;

    const customer = await db.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return notFoundResponse("Cliente no encontrado");
    }

    // Verificar teléfono duplicado
    if (phone && phone !== customer.phone) {
      const existingCustomer = await db.customer.findFirst({
        where: { phone, NOT: { id } },
      });

      if (existingCustomer) {
        return Response.json(
          { success: false, error: "Ya existe un cliente con este teléfono" },
          { status: 400 }
        );
      }
    }

    const updatedCustomer = await db.customer.update({
      where: { id },
      data: {
        name: name?.trim(),
        phone,
        email,
        address,
        notes,
        creditLimit,
        isActive,
      },
    });

    return successResponse(updatedCustomer, "Cliente actualizado");
  } catch (error) {
    return handleServerError(error, "Error al actualizar cliente");
  }
}

// DELETE - Eliminar cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        sales: true,
      },
    });

    if (!customer) {
      return notFoundResponse("Cliente no encontrado");
    }

    // Verificar si tiene ventas a crédito pendientes
    const hasPendingCredit = customer.sales.some(
      (sale) => sale.isCredit && sale.paymentStatus !== "COMPLETADA"
    );

    if (hasPendingCredit) {
      // Soft delete
      await db.customer.update({
        where: { id },
        data: { isActive: false },
      });
      return successResponse(null, "Cliente desactivado (tiene créditos pendientes)");
    }

    // Hard delete si no tiene deudas
    await db.customer.delete({
      where: { id },
    });

    return successResponse(null, "Cliente eliminado");
  } catch (error) {
    return handleServerError(error, "Error al eliminar cliente");
  }
}
