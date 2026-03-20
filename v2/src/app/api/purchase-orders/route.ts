import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  paginatedResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { purchaseOrderSchema } from "@/lib/validations";

// Helper para generar número de orden
async function generateOrderNumber(): Promise<string> {
  const lastOrder = await db.purchaseOrder.findFirst({
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });

  if (!lastOrder) {
    return "OC-00001";
  }

  const lastNumber = parseInt(lastOrder.orderNumber.replace("OC-", ""));
  const newNumber = lastNumber + 1;
  return `OC-${String(newNumber).padStart(5, "0")}`;
}

// GET - Listar órdenes de compra con filtros
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
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

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

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }
      where.orderDate = dateFilter;
    }

    // Obtener órdenes
    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { orderDate: "desc" },
        skip,
        take: limit,
      }),
      db.purchaseOrder.count({ where }),
    ]);

    const ordersWithCounts = orders.map((order) => ({
      ...order,
      itemsCount: order._count.items,
    }));

    return paginatedResponse(ordersWithCounts, page, limit, total);
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

    if (user.role !== "ADMIN") {
      return Response.json(
        { success: false, error: "No tienes permisos para crear órdenes de compra" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = purchaseOrderSchema.safeParse(body);

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

    // Verificar que el proveedor existe
    const supplier = await db.supplier.findUnique({
      where: { id: data.supplierId },
    });

    if (!supplier) {
      return Response.json(
        { success: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que todos los productos existen
    const productIds = data.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return Response.json(
        { success: false, error: "Uno o más productos no existen" },
        { status: 400 }
      );
    }

    // Calcular totales
    let subtotal = 0;
    const itemsData = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const itemSubtotal = item.quantity * item.unitCost;
      subtotal += itemSubtotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: itemSubtotal,
        receivedQty: 0,
      };
    });

    // Calcular impuesto (asumiendo 19% IVA)
    const tax = subtotal * 0.19;
    const total = subtotal + tax;

    // Generar número de orden
    const orderNumber = await generateOrderNumber();

    // Crear la orden con sus items en una transacción
    const order = await db.$transaction(async (tx) => {
      // Crear la orden
      const newOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: data.supplierId,
          subtotal,
          tax,
          total,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          paymentStatus: "PENDIENTE",
          paidAmount: 0,
          pendingAmount: total,
          notes: data.notes || null,
          items: {
            create: itemsData,
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

      // Si hay fecha de vencimiento y paymentStatus es PENDIENTE, crear deuda
      if (data.dueDate && newOrder.paymentStatus === "PENDIENTE") {
        await tx.supplierDebt.create({
          data: {
            supplierId: data.supplierId,
            purchaseOrderId: newOrder.id,
            amount: total,
            paidAmount: 0,
            pendingAmount: total,
            dueDate: new Date(data.dueDate),
            status: "PENDIENTE",
            notes: `Deuda generada desde orden ${orderNumber}`,
          },
        });
      }

      return newOrder;
    });

    return successResponse(order, "Orden de compra creada correctamente", 201);
  } catch (error) {
    return handleServerError(error, "Error al crear orden de compra");
  }
}
