import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { purchaseOrderUpdateSchema, receiveOrderSchema } from "@/lib/validations";

// GET - Obtener orden de compra por ID con detalle completo
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
              include: {
                category: true,
              },
            },
          },
        },
        supplierDebts: true,
      },
    });

    if (!order) {
      return notFoundResponse("Orden de compra no encontrada");
    }

    // Calcular estadísticas de recepción
    const totalItems = order.items.length;
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = order.items.reduce((sum, item) => sum + item.receivedQty, 0);
    const receivedPercentage = totalQuantity > 0 ? (totalReceived / totalQuantity) * 100 : 0;

    return successResponse({
      ...order,
      stats: {
        totalItems,
        totalQuantity,
        totalReceived,
        receivedPercentage: Math.round(receivedPercentage * 100) / 100,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener orden de compra");
  }
}

// PUT - Actualizar orden de compra (estado, fechas, notas)
export async function PUT(
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
        { success: false, error: "No tienes permisos para actualizar órdenes de compra" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar si es una solicitud de recepción de productos
    if (body.items && Array.isArray(body.items) && body.items.length > 0 && body.items[0].itemId) {
      return handleReceiveProducts(id, body, user.id);
    }

    // Si no es recepción, es actualización normal
    const validation = purchaseOrderUpdateSchema.safeParse(body);

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

    // Verificar que la orden existe
    const existingOrder = await db.purchaseOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return notFoundResponse("Orden de compra no encontrada");
    }

    // No permitir actualizar órdenes canceladas o recibidas completamente
    if (existingOrder.status === "CANCELADO" || existingOrder.status === "RECIBIDO_COMPLETO") {
      return Response.json(
        { success: false, error: "No se puede actualizar una orden cancelada o completamente recibida" },
        { status: 400 }
      );
    }

    // Actualizar la orden
    const order = await db.purchaseOrder.update({
      where: { id },
      data: {
        status: data.status,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : existingOrder.expectedDate,
        dueDate: data.dueDate ? new Date(data.dueDate) : existingOrder.dueDate,
        notes: data.notes ?? existingOrder.notes,
        updatedAt: new Date(),
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return successResponse(order, "Orden de compra actualizada correctamente");
  } catch (error) {
    return handleServerError(error, "Error al actualizar orden de compra");
  }
}

// Función para manejar la recepción de productos
async function handleReceiveProducts(
  orderId: string,
  body: Record<string, unknown>,
  userId: string
) {
  const validation = receiveOrderSchema.safeParse(body);

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

  // Verificar que la orden existe
  const order = await db.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    return notFoundResponse("Orden de compra no encontrada");
  }

  // Verificar que la orden no esté cancelada o ya completamente recibida
  if (order.status === "CANCELADO") {
    return Response.json(
      { success: false, error: "No se pueden recibir productos de una orden cancelada" },
      { status: 400 }
    );
  }

  if (order.status === "RECIBIDO_COMPLETO") {
    return Response.json(
      { success: false, error: "La orden ya fue recibida completamente" },
      { status: 400 }
    );
  }

  // Procesar recepción en una transacción
  const result = await db.$transaction(async (tx) => {
    let totalReceived = 0;
    let totalExpected = 0;

    for (const receivedItem of data.items) {
      const orderItem = order.items.find((item) => item.id === receivedItem.itemId);

      if (!orderItem) {
        throw new Error(`Item ${receivedItem.itemId} no encontrado en la orden`);
      }

      const newReceivedQty = orderItem.receivedQty + receivedItem.receivedQty;
      totalReceived += newReceivedQty;
      totalExpected += orderItem.quantity;

      // Actualizar el item de la orden
      await tx.purchaseItem.update({
        where: { id: receivedItem.itemId },
        data: {
          receivedQty: newReceivedQty,
        },
      });

      // Actualizar el stock del producto y crear log de inventario
      const previousStock = orderItem.product.stock;
      const newStock = previousStock + receivedItem.receivedQty;

      await tx.product.update({
        where: { id: orderItem.productId },
        data: {
          stock: newStock,
          costPrice: orderItem.unitCost, // Actualizar precio de costo
        },
      });

      // Crear log de inventario
      await tx.inventoryLog.create({
        data: {
          productId: orderItem.productId,
          changeType: "COMPRA",
          quantity: receivedItem.receivedQty,
          reason: `Recepción de orden ${order.orderNumber}`,
          previousStock,
          newStock,
          userId,
        },
      });
    }

    // Determinar nuevo estado de la orden
    const allItemsReceived = order.items.every(
      (item) => {
        const received = data.items.find((r) => r.itemId === item.id);
        return item.receivedQty + (received?.receivedQty || 0) >= item.quantity;
      }
    );

    const newStatus = allItemsReceived ? "RECIBIDO_COMPLETO" : "RECIBIDO_PARCIAL";

    // Actualizar la orden
    const updatedOrder = await tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        receivedDate: newStatus === "RECIBIDO_COMPLETO" ? new Date() : null,
        notes: data.notes ? `${order.notes || ""}\n${data.notes}` : order.notes,
        updatedAt: new Date(),
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return updatedOrder;
  });

  return successResponse(result, "Productos recibidos correctamente");
}

// DELETE - Cancelar orden de compra
export async function DELETE(
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
        { success: false, error: "No tienes permisos para cancelar órdenes de compra" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar que la orden existe
    const order = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        supplierDebts: true,
      },
    });

    if (!order) {
      return notFoundResponse("Orden de compra no encontrada");
    }

    // Verificar que no esté ya recibida o cancelada
    if (order.status === "CANCELADO") {
      return Response.json(
        { success: false, error: "La orden ya está cancelada" },
        { status: 400 }
      );
    }

    if (order.status === "RECIBIDO_COMPLETO") {
      return Response.json(
        { success: false, error: "No se puede cancelar una orden completamente recibida" },
        { status: 400 }
      );
    }

    // Verificar si hay productos ya recibidos
    const hasReceivedItems = order.items.some((item) => item.receivedQty > 0);
    if (hasReceivedItems) {
      return Response.json(
        { success: false, error: "No se puede cancelar la orden porque ya hay productos recibidos" },
        { status: 400 }
      );
    }

    // Cancelar la orden y sus deudas asociadas en una transacción
    await db.$transaction(async (tx) => {
      // Cancelar la orden
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "CANCELADO",
          paymentStatus: "CANCELADA",
          pendingAmount: 0,
          updatedAt: new Date(),
        },
      });

      // Cancelar las deudas asociadas
      if (order.supplierDebts.length > 0) {
        await tx.supplierDebt.updateMany({
          where: { purchaseOrderId: id },
          data: {
            status: "PAGADO", // Se marca como pagado para que no aparezca en deudas pendientes
            pendingAmount: 0,
            notes: "Orden de compra cancelada",
            updatedAt: new Date(),
          },
        });
      }
    });

    return successResponse(null, "Orden de compra cancelada correctamente");
  } catch (error) {
    return handleServerError(error, "Error al cancelar orden de compra");
  }
}
