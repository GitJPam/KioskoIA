import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { customerUpdateSchema } from "@/lib/validations";

// GET - Obtener cliente por ID con saldo pendiente
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
        _count: {
          select: { sales: true, creditPayments: true },
        },
      },
    });

    if (!customer) {
      return notFoundResponse("Cliente no encontrado");
    }

    // Calcular saldo pendiente
    // Total de ventas a crédito
    const creditSales = await db.sale.aggregate({
      where: {
        customerId: customer.id,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
      },
      _sum: { total: true },
    });

    // Total de pagos realizados
    const payments = await db.creditPayment.aggregate({
      where: { customerId: customer.id },
      _sum: { amount: true },
    });

    // Ventas pendientes individuales
    const pendingSales = await db.sale.findMany({
      where: {
        customerId: customer.id,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Calcular pagos por cada venta
    const salesWithBalance = await Promise.all(
      pendingSales.map(async (sale) => {
        const salePayments = await db.creditPayment.aggregate({
          where: { saleId: sale.id },
          _sum: { amount: true },
        });
        const paidAmount = salePayments._sum.amount || 0;
        return {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          total: sale.total,
          paidAmount,
          pendingAmount: sale.total - paidAmount,
          createdAt: sale.createdAt,
          creditDueDate: sale.creditDueDate,
          items: sale.items.map((item) => ({
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };
      })
    );

    const totalCredit = creditSales._sum.total || 0;
    const totalPayments = payments._sum.amount || 0;
    const pendingBalance = totalCredit - totalPayments;

    return successResponse({
      ...customer,
      salesCount: customer._count.sales,
      paymentsCount: customer._count.creditPayments,
      totalCredit,
      totalPayments,
      pendingBalance,
      availableCredit: customer.creditLimit - pendingBalance,
      pendingSales: salesWithBalance,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener cliente");
  }
}

// PUT - Actualizar cliente
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
    const validation = customerUpdateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "Datos de entrada inválidos: " + validation.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = validation.data;

    // Verificar que el cliente existe
    const existingCustomer = await db.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return notFoundResponse("Cliente no encontrado");
    }

    // Si se está actualizando el email, verificar que no exista otro cliente con ese email
    if (data.email && data.email !== existingCustomer.email) {
      const customerWithEmail = await db.customer.findFirst({
        where: {
          email: data.email,
          isActive: true,
          NOT: { id },
        },
      });

      if (customerWithEmail) {
        return errorResponse("Ya existe otro cliente con este email", 400);
      }
    }

    const customer = await db.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date(),
      },
    });

    return successResponse(customer, "Cliente actualizado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al actualizar cliente");
  }
}

// DELETE - Eliminar cliente (si no tiene deudas)
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

    // Verificar que el cliente existe
    const customer = await db.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return notFoundResponse("Cliente no encontrado");
    }

    // Verificar si tiene deudas pendientes
    const creditSales = await db.sale.aggregate({
      where: {
        customerId: id,
        isCredit: true,
        paymentStatus: { in: ["PENDIENTE", "FIADO"] },
      },
      _sum: { total: true },
    });

    const payments = await db.creditPayment.aggregate({
      where: { customerId: id },
      _sum: { amount: true },
    });

    const pendingBalance = (creditSales._sum.total || 0) - (payments._sum.amount || 0);

    if (pendingBalance > 0) {
      return errorResponse(
        `No se puede eliminar el cliente porque tiene un saldo pendiente de ${pendingBalance.toLocaleString("es-CO", { style: "currency", currency: "COP" })}`,
        400
      );
    }

    // Verificar si tiene ventas asociadas
    const salesCount = await db.sale.count({
      where: { customerId: id },
    });

    if (salesCount > 0) {
      // Soft delete si tiene ventas
      await db.customer.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
      return successResponse(null, "Cliente desactivado correctamente (tiene historial de ventas)");
    }

    // Hard delete si no tiene ventas
    await db.customer.delete({
      where: { id },
    });

    return successResponse(null, "Cliente eliminado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al eliminar cliente");
  }
}
