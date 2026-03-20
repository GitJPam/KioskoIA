import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Obtener saldo pendiente y límite de crédito del cliente
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

    // Verificar que el cliente existe
    const customer = await db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        creditLimit: true,
        isActive: true,
      },
    });

    if (!customer) {
      return notFoundResponse("Cliente no encontrado");
    }

    // Calcular total de ventas a crédito pendientes
    const creditSales = await db.sale.aggregate({
      where: {
        customerId: id,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
      },
      _sum: { total: true },
    });

    // Calcular total de pagos realizados
    const payments = await db.creditPayment.aggregate({
      where: { customerId: id },
      _sum: { amount: true },
    });

    // Calcular ventas a crédito vencidas
    const overdueSales = await db.sale.findMany({
      where: {
        customerId: id,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
        creditDueDate: { lt: new Date() },
      },
      select: { total: true },
    });

    // Obtener pagos de las ventas vencidas
    const overdueSaleIds = overdueSales.map((s) => s.id);
    const overduePayments = await db.creditPayment.aggregate({
      where: {
        saleId: { in: overdueSaleIds },
      },
      _sum: { amount: true },
    });

    const totalCredit = creditSales._sum.total || 0;
    const totalPayments = payments._sum.amount || 0;
    const pendingBalance = totalCredit - totalPayments;
    const overdueTotal = overdueSales.reduce((sum, s) => sum + s.total, 0);
    const overduePaymentsTotal = overduePayments._sum.amount || 0;
    const overdueBalance = overdueTotal - overduePaymentsTotal;
    const availableCredit = customer.creditLimit - pendingBalance;

    // Conteo de ventas pendientes y vencidas
    const pendingSalesCount = await db.sale.count({
      where: {
        customerId: id,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
      },
    });

    const overdueSalesCount = await db.sale.count({
      where: {
        customerId: id,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
        creditDueDate: { lt: new Date() },
      },
    });

    // Verificar si puede recibir más crédito
    const canReceiveCredit = customer.isActive && availableCredit > 0;

    return successResponse({
      customer: {
        id: customer.id,
        name: customer.name,
        isActive: customer.isActive,
      },
      creditLimit: customer.creditLimit,
      totalCredit,
      totalPayments,
      pendingBalance,
      availableCredit,
      overdueBalance,
      pendingSalesCount,
      overdueSalesCount,
      canReceiveCredit,
      creditUsagePercentage: customer.creditLimit > 0 
        ? Math.min(100, (pendingBalance / customer.creditLimit) * 100)
        : 0,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener saldo del cliente");
  }
}
