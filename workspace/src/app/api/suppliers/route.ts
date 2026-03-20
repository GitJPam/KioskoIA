import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { supplierSchema } from "@/lib/validations";

// GET - Listar proveedores
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const suppliers = await db.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    return successResponse(
      suppliers.map((s) => ({
        ...s,
        ordersCount: s._count.purchaseOrders,
      }))
    );
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
      return errorResponse("No tienes permisos para crear proveedores", 403);
    }

    const body = await request.json();
    const validation = supplierSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Datos de entrada inválidos", 400);
    }

    const data = validation.data;

    const supplier = await db.supplier.create({
      data: {
        name: data.name,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        notes: data.notes,
        isActive: data.isActive,
      },
    });

    return successResponse(supplier, "Proveedor creado correctamente", 201);
  } catch (error) {
    return handleServerError(error, "Error al crear proveedor");
  }
}
