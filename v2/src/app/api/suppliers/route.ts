import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  paginatedResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { supplierSchema } from "@/lib/validations";

// GET - Listar proveedores con paginación, búsqueda y totalDebt
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
        { name: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { taxId: { contains: search } },
      ];
    }

    // Obtener proveedores con conteo de órdenes y deudas
    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: { purchaseOrders: true, supplierDebts: true },
          },
          supplierDebts: {
            where: {
              status: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
            },
            select: {
              pendingAmount: true,
            },
          },
        },
      }),
      db.supplier.count({ where }),
    ]);

    // Calcular deuda total para cada proveedor
    const suppliersWithDebt = suppliers.map((supplier) => {
      const totalDebt = supplier.supplierDebts.reduce(
        (sum, debt) => sum + debt.pendingAmount,
        0
      );

      return {
        id: supplier.id,
        name: supplier.name,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        taxId: supplier.taxId,
        paymentTerms: supplier.paymentTerms,
        notes: supplier.notes,
        isActive: supplier.isActive,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        ordersCount: supplier._count.purchaseOrders,
        debtsCount: supplier._count.supplierDebts,
        totalDebt,
      };
    });

    return paginatedResponse(suppliersWithDebt, page, limit, total);
  } catch (error) {
    return handleServerError(error, "Error al listar proveedores");
  }
}

// POST - Crear proveedor
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return Response.json(
        { success: false, error: "No tienes permisos para crear proveedores" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = supplierSchema.safeParse(body);

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

    // Verificar si ya existe un proveedor con el mismo nombre
    const existingSupplier = await db.supplier.findFirst({
      where: { name: data.name },
    });

    if (existingSupplier) {
      return Response.json(
        { success: false, error: "Ya existe un proveedor con este nombre" },
        { status: 400 }
      );
    }

    const supplier = await db.supplier.create({
      data: {
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        taxId: data.taxId || null,
        paymentTerms: data.paymentTerms ?? 0,
        notes: data.notes || null,
        isActive: data.isActive ?? true,
      },
    });

    return successResponse(
      {
        ...supplier,
        ordersCount: 0,
        debtsCount: 0,
        totalDebt: 0,
      },
      "Proveedor creado correctamente",
      201
    );
  } catch (error) {
    return handleServerError(error, "Error al crear proveedor");
  }
}
