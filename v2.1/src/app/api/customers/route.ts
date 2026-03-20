import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const includeInactive = searchParams.get("includeInactive") === "true";

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: {
          sales: {
            where: { isCredit: true },
            select: { total: true, paymentStatus: true },
          },
          creditPayments: {
            select: { amount: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      db.customer.count({ where }),
    ]);

    // Calcular saldo pendiente para cada cliente
    const customersWithBalance = customers.map((customer) => {
      const totalCredit = customer.sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalPaid = customer.creditPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const pendingBalance = totalCredit - totalPaid;
      const creditAvailable = customer.creditLimit - pendingBalance;

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        notes: customer.notes,
        creditLimit: customer.creditLimit,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        pendingBalance,
        creditAvailable: Math.max(0, creditAvailable),
        isOverLimit: pendingBalance > customer.creditLimit,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return Response.json({
      success: true,
      data: customersWithBalance,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
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
    const { name, phone, email, address, notes, creditLimit } = body;

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un cliente con el mismo teléfono
    if (phone) {
      const existingCustomer = await db.customer.findFirst({
        where: { phone },
      });

      if (existingCustomer) {
        return Response.json(
          { success: false, error: "Ya existe un cliente con este teléfono" },
          { status: 400 }
        );
      }
    }

    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        phone,
        email,
        address,
        notes,
        creditLimit: creditLimit || 0,
      },
    });

    return successResponse(customer, "Cliente creado exitosamente");
  } catch (error) {
    return handleServerError(error, "Error al crear cliente");
  }
}
