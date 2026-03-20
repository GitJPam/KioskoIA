import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Historial de pagos de crédito
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const saleId = searchParams.get("saleId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (saleId) {
      where.saleId = saleId;
    }

    const [payments, total] = await Promise.all([
      db.creditPayment.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
          sale: {
            select: { invoiceNumber: true, total: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.creditPayment.count({ where }),
    ]);

    // Estadísticas
    const stats = await db.creditPayment.aggregate({
      _sum: { amount: true },
      _count: true,
    });

    const totalPages = Math.ceil(total / limit);

    return Response.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        totalPayments: stats._count,
        totalAmount: stats._sum.amount || 0,
      },
    });
  } catch (error) {
    return handleServerError(error, "Error al listar pagos");
  }
}

// POST - Registrar pago de crédito
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { saleId, customerId, amount, paymentMethod, notes } = body;

    // Validaciones
    if (!saleId) {
      return errorResponse("El ID de la venta es requerido");
    }

    if (!amount || amount <= 0) {
      return errorResponse("El monto debe ser mayor a 0");
    }

    // Verificar la venta
    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: {
        creditPayments: true,
        customer: true,
      },
    });

    if (!sale) {
      return errorResponse("Venta no encontrada", 404);
    }

    if (!sale.isCredit) {
      return errorResponse("Esta venta no es un crédito");
    }

    // Calcular saldo pendiente
    const totalPaid = sale.creditPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const pendingAmount = sale.total - totalPaid;

    if (amount > pendingAmount) {
      return errorResponse(
        `El pago excede el saldo pendiente. Saldo: ${pendingAmount}`
      );
    }

    // Crear el pago y actualizar la venta
    const result = await db.$transaction(async (tx) => {
      // Crear pago
      const payment = await tx.creditPayment.create({
        data: {
          saleId,
          customerId: customerId || sale.customerId,
          amount,
          paymentMethod: paymentMethod || "EFECTIVO",
          notes,
        },
      });

      // Actualizar estado de la venta si se pagó completamente
      const newTotalPaid = totalPaid + amount;
      if (newTotalPaid >= sale.total) {
        await tx.sale.update({
          where: { id: saleId },
          data: {
            paymentStatus: "COMPLETADA",
            updatedAt: new Date(),
          },
        });
      }

      return payment;
    });

    return successResponse(result, "Pago registrado exitosamente");
  } catch (error) {
    return handleServerError(error, "Error al registrar pago");
  }
}
