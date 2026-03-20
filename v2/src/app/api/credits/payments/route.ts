import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
  paginatedResponse,
} from "@/lib/api-helpers";
import { creditPaymentSchema } from "@/lib/validations";

// GET - Historial de pagos de crédito
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const customerId = searchParams.get("customerId");
    const saleId = searchParams.get("saleId");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (saleId) {
      where.saleId = saleId;
    }

    // Obtener total de registros
    const total = await db.creditPayment.count({ where });

    // Obtener pagos
    const payments = await db.creditPayment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    return paginatedResponse(payments, page, limit, total);
  } catch (error) {
    return handleServerError(error, "Error al listar pagos de crédito");
  }
}

// POST - Registrar un pago de crédito
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = creditPaymentSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "Datos de entrada inválidos: " + validation.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = validation.data;

    // Verificar que la venta existe
    const sale = await db.sale.findUnique({
      where: { id: data.saleId },
      include: {
        customer: true,
      },
    });

    if (!sale) {
      return notFoundResponse("Venta no encontrada");
    }

    // Verificar que es una venta a crédito
    if (!sale.isCredit) {
      return errorResponse("Esta venta no es a crédito", 400);
    }

    // Verificar que el cliente coincide
    if (sale.customerId !== data.customerId) {
      return errorResponse("El cliente no coincide con la venta", 400);
    }

    // Calcular saldo pendiente de la venta
    const existingPayments = await db.creditPayment.aggregate({
      where: { saleId: sale.id },
      _sum: { amount: true },
    });

    const totalPaid = existingPayments._sum.amount || 0;
    const pendingAmount = sale.total - totalPaid;

    // Verificar que el pago no exceda el saldo pendiente
    if (data.amount > pendingAmount) {
      return errorResponse(
        `El monto del pago (${data.amount.toLocaleString("es-CO", { style: "currency", currency: "COP" })}) excede el saldo pendiente (${pendingAmount.toLocaleString("es-CO", { style: "currency", currency: "COP" })})`,
        400
      );
    }

    // Crear el pago
    const payment = await db.creditPayment.create({
      data: {
        saleId: data.saleId,
        customerId: data.customerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
      },
    });

    // Verificar si la venta quedó totalmente pagada
    const newTotalPaid = totalPaid + data.amount;
    if (newTotalPaid >= sale.total) {
      // Actualizar el estado de la venta a COMPLETADA
      await db.sale.update({
        where: { id: sale.id },
        data: {
          paymentStatus: "COMPLETADA",
          updatedAt: new Date(),
        },
      });
    }

    // Calcular nuevo saldo pendiente del cliente
    const customerCreditSales = await db.sale.aggregate({
      where: {
        customerId: data.customerId,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
      },
      _sum: { total: true },
    });

    const customerPayments = await db.creditPayment.aggregate({
      where: { customerId: data.customerId },
      _sum: { amount: true },
    });

    const newPendingBalance = (customerCreditSales._sum.total || 0) - (customerPayments._sum.amount || 0);

    return successResponse(
      {
        payment,
        saleFullyPaid: newTotalPaid >= sale.total,
        newPendingBalance,
      },
      "Pago registrado correctamente",
      201
    );
  } catch (error) {
    return handleServerError(error, "Error al registrar pago de crédito");
  }
}
