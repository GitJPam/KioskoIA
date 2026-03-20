import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Listar órdenes de compra
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (status) {
      where.status = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, phone: true },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.purchaseOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Estadísticas
    const stats = await db.purchaseOrder.aggregate({
      where: { status: { not: "CANCELADO" } },
      _sum: { total: true },
      _count: true,
    });

    const pendingPayments = await db.purchaseOrder.aggregate({
      where: { paymentStatus: "PENDIENTE" },
      _sum: { pendingAmount: true },
      _count: true,
    });

    return Response.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        totalOrders: stats._count,
        totalAmount: stats._sum.total || 0,
        pendingPayments: pendingPayments._count,
        pendingAmount: pendingPayments._sum.pendingAmount || 0,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al listar órdenes de compra");
  }
}

// POST - Crear orden de compra
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { supplierId, expectedDate, dueDate, notes, items } = body;

    if (!supplierId) {
      return Response.json(
        { success: false, error: "El proveedor es requerido" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return Response.json(
        { success: false, error: "Debe agregar al menos un producto" },
        { status: 400 }
      );
    }

    // Generar número de orden
    const lastOrder = await db.purchaseOrder.findFirst({
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });

    let orderNumber = "OC-00001";
    if (lastOrder?.orderNumber) {
      const lastNum = parseInt(lastOrder.orderNumber.replace("OC-", ""));
      orderNumber = `OC-${String(lastNum + 1).padStart(5, "0")}`;
    }

    // Calcular totales
    let subtotal = 0;
    const orderItems = items.map((item: { productId: string; quantity: number; unitCost: number }) => {
      const itemSubtotal = item.quantity * item.unitCost;
      subtotal += itemSubtotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: itemSubtotal,
      };
    });

    const tax = subtotal * 0.19; // IVA 19%
    const total = subtotal + tax;

    // Crear orden
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId,
          status: "PENDIENTE",
          subtotal,
          tax,
          total,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          pendingAmount: total,
          notes,
          items: {
            create: orderItems,
          },
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

      // Crear deuda si tiene fecha de vencimiento
      if (dueDate && total > 0) {
        await tx.supplierDebt.create({
          data: {
            supplierId,
            purchaseOrderId: newOrder.id,
            amount: total,
            paidAmount: 0,
            pendingAmount: total,
            dueDate: new Date(dueDate),
            status: "PENDIENTE",
          },
        });
      }

      return newOrder;
    });

    return successResponse(order, "Orden de compra creada");
  } catch (error) {
    return handleServerError(error, "Error al crear orden de compra");
  }
}
