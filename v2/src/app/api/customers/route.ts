import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
  paginatedResponse,
} from "@/lib/api-helpers";
import { customerSchema } from "@/lib/validations";

// GET - Listar clientes con búsqueda y paginación
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Obtener total de registros
    const total = await db.customer.count({ where });

    // Obtener clientes con información de ventas a crédito
    const customers = await db.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { sales: true, creditPayments: true },
        },
        sales: {
          where: {
            isCredit: true,
            paymentStatus: { in: ["PENDIENTE", "FIADO"] },
          },
          select: {
            total: true,
          },
        },
      },
    });

    // Calcular saldo pendiente para cada cliente
    const customersWithBalance = await Promise.all(
      customers.map(async (customer) => {
        // Total de ventas a crédito pendientes
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

        const totalCredit = creditSales._sum.total || 0;
        const totalPayments = payments._sum.amount || 0;
        const pendingBalance = totalCredit - totalPayments;

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
          creditLimit: customer.creditLimit,
          isActive: customer.isActive,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          salesCount: customer._count.sales,
          paymentsCount: customer._count.creditPayments,
          totalCredit,
          totalPayments,
          pendingBalance,
          availableCredit: customer.creditLimit - pendingBalance,
        };
      })
    );

    return paginatedResponse(customersWithBalance, page, limit, total);
  } catch (error) {
    return handleServerError(error, "Error al listar clientes");
  }
}

// POST - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        "Datos de entrada inválidos: " + validation.error.errors.map((e) => e.message).join(", "),
        400
      );
    }

    const data = validation.data;

    // Verificar si ya existe un cliente con el mismo email
    if (data.email) {
      const existingCustomer = await db.customer.findFirst({
        where: {
          email: data.email,
          isActive: true,
        },
      });

      if (existingCustomer) {
        return errorResponse("Ya existe un cliente con este email", 400);
      }
    }

    const customer = await db.customer.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        notes: data.notes || null,
        creditLimit: data.creditLimit || 0,
        isActive: data.isActive ?? true,
      },
    });

    return successResponse(customer, "Cliente creado correctamente", 201);
  } catch (error) {
    return handleServerError(error, "Error al crear cliente");
  }
}
