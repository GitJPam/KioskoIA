import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { supplierPaymentSchema } from "@/lib/validations";

// POST - Registrar pago a proveedor
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return Response.json(
        { success: false, error: "No tienes permisos para registrar pagos" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = supplierPaymentSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          success: false,
          error: "Datos de entrada inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar que la deuda existe
    const debt = await db.supplierDebt.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
    });

    if (!debt) {
      return notFoundResponse("Deuda no encontrada");
    }

    // Verificar que la deuda no esté ya pagada
    if (debt.status === "PAGADO") {
      return Response.json(
        { success: false, error: "Esta deuda ya está completamente pagada" },
        { status: 400 }
      );
    }

    // Verificar que el monto no exceda el pendiente
    if (data.amount > debt.pendingAmount) {
      return Response.json(
        {
          success: false,
          error: `El monto excede el saldo pendiente. Saldo: ${debt.pendingAmount}`,
        },
        { status: 400 }
      );
    }

    // Procesar el pago en una transacción
    const result = await db.$transaction(async (tx) => {
      const newPaidAmount = debt.paidAmount + data.amount;
      const newPendingAmount = debt.amount - newPaidAmount;

      // Determinar nuevo estado
      let newStatus: "PENDIENTE" | "PARCIAL" | "PAGADO" | "VENCIDO" = debt.status;
      if (newPendingAmount <= 0) {
        newStatus = "PAGADO";
      } else if (newPaidAmount > 0) {
        newStatus = "PARCIAL";
      }

      // Actualizar la deuda
      const updatedDebt = await tx.supplierDebt.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          pendingAmount: Math.max(0, newPendingAmount),
          status: newStatus,
          notes: data.notes
            ? `${debt.notes || ""}\nPago: ${data.notes}`
            : debt.notes,
          updatedAt: new Date(),
        },
      });

      // Si hay orden de compra asociada, actualizar sus montos
      if (debt.purchaseOrderId) {
        const orderDebts = await tx.supplierDebt.findMany({
          where: { purchaseOrderId: debt.purchaseOrderId },
        });

        const totalPaid = orderDebts.reduce((sum, d) => sum + d.paidAmount, 0);
        const totalPending = orderDebts.reduce((sum, d) => sum + d.pendingAmount, 0);

        // Obtener la orden para el total
        const order = await tx.purchaseOrder.findUnique({
          where: { id: debt.purchaseOrderId },
        });

        if (order) {
          let paymentStatus = order.paymentStatus;
          if (totalPending <= 0) {
            paymentStatus = "COMPLETADA";
          } else if (totalPaid > 0) {
            paymentStatus = "PENDIENTE"; // Sigue pendiente hasta completar
          }

          await tx.purchaseOrder.update({
            where: { id: debt.purchaseOrderId },
            data: {
              paidAmount: totalPaid + data.amount, // Add current payment
              pendingAmount: Math.max(0, totalPending),
              paymentStatus,
              updatedAt: new Date(),
            },
          });
        }
      }

      // Crear registro de actividad (opcional, si hay tabla de actividades)
      await tx.activity.create({
        data: {
          userId: user.id,
          action: "PAYMENT",
          entityType: "SupplierDebt",
          entityId: debt.id,
          description: `Pago de ${data.amount} a ${debt.supplier.name}`,
          metadata: JSON.stringify({
            amount: data.amount,
            supplierId: debt.supplierId,
            purchaseOrderId: debt.purchaseOrderId,
          }),
        },
      });

      return {
        debt: updatedDebt,
        payment: {
          amount: data.amount,
          previousPaid: debt.paidAmount,
          newPaid: newPaidAmount,
          previousPending: debt.pendingAmount,
          newPending: Math.max(0, newPendingAmount),
        },
      };
    });

    return successResponse(
      {
        debt: result.debt,
        paymentDetails: result.payment,
      },
      "Pago registrado correctamente"
    );
  } catch (error) {
    return handleServerError(error, "Error al registrar pago");
  }
}
