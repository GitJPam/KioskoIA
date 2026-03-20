import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  unauthorizedResponse,
  handleServerError,
  startOfDay,
  endOfDay,
} from "@/lib/api-helpers";
import { saleSchema } from "@/lib/validations";

// GET - Listar ventas
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const paymentMethod = searchParams.get("paymentMethod");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    // Obtener ventas
    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.sale.count({ where }),
    ]);

    return paginatedResponse(sales, page, limit, total);
  } catch (error) {
    return handleServerError(error, "Error al listar ventas");
  }
}

// POST - Crear venta
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = saleSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Datos de entrada inválidos", 400);
    }

    const data = validation.data;

    // Verificar productos y stock
    const productIds = data.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return errorResponse("Uno o más productos no existen", 400);
    }

    // Verificar stock disponible
    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return errorResponse(`Producto no encontrado`, 400);
      }
      if (product.stock < item.quantity) {
        return errorResponse(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`,
          400
        );
      }
    }

    // Calcular totales
    let subtotal = 0;
    const saleItems = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const itemSubtotal = product.salePrice * item.quantity;
      subtotal += itemSubtotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        subtotal: itemSubtotal,
        discount: 0,
      };
    });

    const total = subtotal; // Sin impuestos por ahora

    // Obtener último número de factura
    const lastSale = await db.sale.findFirst({
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    const lastNumber = lastSale
      ? parseInt(lastSale.invoiceNumber.replace("FAC-", ""))
      : 0;
    const invoiceNumber = `FAC-${String(lastNumber + 1).padStart(5, "0")}`;

    // Crear venta en transacción
    const sale = await db.$transaction(async (tx) => {
      // Crear venta
      const newSale = await tx.sale.create({
        data: {
          invoiceNumber,
          userId: user.id,
          total,
          subtotal,
          discount: 0,
          tax: 0,
          paymentMethod: data.paymentMethod,
          paymentStatus: "COMPLETADA",
          customerName: data.customerName,
          notes: data.notes,
          deviceId: data.deviceId,
          isSynced: true,
          syncedAt: new Date(),
          items: {
            create: saleItems,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Actualizar stock de productos
      for (const item of data.items) {
        const product = products.find((p) => p.id === item.productId)!;
        const newStock = product.stock - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: newStock },
        });

        // Crear log de inventario
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            changeType: "VENTA",
            quantity: -item.quantity,
            reason: `Venta ${invoiceNumber}`,
            previousStock: product.stock,
            newStock,
            userId: user.id,
          },
        });
      }

      return newSale;
    });

    return successResponse(sale, "Venta registrada correctamente", 201);
  } catch (error) {
    return handleServerError(error, "Error al crear venta");
  }
}
