import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Saldo y crédito del cliente
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
          select: {
            id: true,
            total: true,
            createdAt: true,
            creditDueDate: true,
            paymentStatus: true,
          },
        },
        creditPayments: {
          select: { amount: true },
        },
      },
    });

    if (!customer) {
      return notFoundResponse("Cliente no encontrado");
    }

    const totalCredit = customer.sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalPaid = customer.creditPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingBalance = totalCredit - totalPaid;
    const creditAvailable = customer.creditLimit - pendingBalance;

    // Créditos vencidos
    const now = new Date();
    const overdueCredits = customer.sales.filter(
      (sale) =>
        sale.creditDueDate &&
        new Date(sale.creditDueDate) < now &&
        sale.paymentStatus !== "COMPLETADA"
    );

    const overdueAmount = overdueCredits.reduce((sum, sale) => sum + sale.total, 0);

    // Calcular lo que ya se pagó de los créditos vencidos
    const paymentsForOverdue = await db.creditPayment.aggregate({
      where: {
        customerId: id,
        saleId: { in: overdueCredits.map((s) => s.id) },
      },
      _sum: { amount: true },
    });

    const overduePending =
      overdueAmount - (paymentsForOverdue._sum.amount || 0);

    return successResponse({
      customerId: customer.id,
      customerName: customer.name,
      creditLimit: customer.creditLimit,
      pendingBalance,
      creditAvailable: Math.max(0, creditAvailable),
      isOverLimit: pendingBalance > customer.creditLimit,
      totalCredit,
      totalPaid,
      overdueCredits: overdueCredits.length,
      overduePending,
      creditUsagePercentage:
        customer.creditLimit > 0
          ? (pendingBalance / customer.creditLimit) * 100
          : 0,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener saldo del cliente");
  }
}
