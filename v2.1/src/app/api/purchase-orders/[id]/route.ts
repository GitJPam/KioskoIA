import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Detalle de orden de compra
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

    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, stock: true },
            },
          },
        },
      },
    });

    if (!order) {
      return notFoundResponse("Orden no encontrada");
    }

    // Calcular progreso de recepción
    const totalItems = order.items.length;
    const receivedItems = order.items.filter(
      (item) => item.receivedQty >= item.quantity
    ).length;
    const receptionProgress =
      totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;

    return successResponse({
      ...order,
      receptionProgress,
      receivedItems,
      totalItems,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener orden");
  }
}

// PUT - Actualizar orden (estado o recibir productos)
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
    const { status, receivedItems, notes } = body;

    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        supplier: true,
      },
    });

    if (!order) {
      return notFoundResponse("Orden no encontrada");
    }

    // Si se reciben productos
    if (receivedItems && Array.isArray(receivedItems)) {
      const result = await db.$transaction(async (tx) => {
        // Actualizar items recibidos y stock
        for (const receivedItem of receivedItems) {
          const item = order.items.find(
            (i) => i.productId === receivedItem.productId
          );
          if (item) {
            const newReceivedQty = item.receivedQty + receivedItem.quantity;

            await tx.purchaseItem.update({
              where: { id: item.id },
              data: { receivedQty: newReceivedQty },
            });

            // Actualizar stock del producto
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: receivedItem.quantity },
              },
            });

            // Registrar en inventario
            await tx.inventoryLog.create({
              data: {
                productId: item.productId,
                changeType: "COMPRA",
                quantity: receivedItem.quantity,
                previousStock: 0, // Se actualizará después
                newStock: receivedItem.quantity,
                reason: `Orden ${order.orderNumber}`,
                userId: user.id,
              },
            });
          }
        }

        // Actualizar estado de la orden
        const allItemsReceived = order.items.every((item) => {
          const received = receivedItems.find(
            (r) => r.productId === item.productId
          );
          const totalReceived =
            item.receivedQty + (received?.quantity || 0);
          return totalReceived >= item.quantity;
        });

        const newStatus = allItemsReceived
          ? "RECIBIDO_COMPLETO"
          : "RECIBIDO_PARCIAL";

        const updatedOrder = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: newStatus,
            receivedDate: new Date(),
            notes,
          },
          include: {
            supplier: true,
            items: {
              include: { product: true },
            },
          },
        });

        return updatedOrder;
      });

      return successResponse(result, "Productos recibidos");
    }

    // Si solo se actualiza el estado
    if (status) {
      const updatedOrder = await db.purchaseOrder.update({
        where: { id },
        data: {
          status,
          notes,
        },
        include: {
          supplier: true,
          items: {
            include: { product: true },
          },
        },
      });

      return successResponse(updatedOrder, "Orden actualizada");
    }

    return successResponse(order);
  } catch (error) {
    return handleServerError(error, "Error al actualizar orden");
  }
}

// DELETE - Cancelar orden
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

    const order = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!order) {
      return notFoundResponse("Orden no encontrada");
    }

    if (order.status === "RECIBIDO_COMPLETO") {
      return Response.json(
        { success: false, error: "No se puede cancelar una orden ya recibida" },
        { status: 400 }
      );
    }

    // Marcar como cancelada
    const cancelledOrder = await db.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELADO" },
    });

    // Actualizar deuda relacionada
    await db.supplierDebt.updateMany({
      where: { purchaseOrderId: id },
      data: { status: "PAGADO", pendingAmount: 0 },
    });

    return successResponse(cancelledOrder, "Orden cancelada");
  } catch (error) {
    return handleServerError(error, "Error al cancelar orden");
  }
}
