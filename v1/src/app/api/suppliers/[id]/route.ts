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
import { supplierSchema } from "@/lib/validations";

// GET - Obtener proveedor por ID
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

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseOrders: true },
        },
      },
    });

    if (!supplier) {
      return notFoundResponse("Proveedor no encontrado");
    }

    return successResponse({
      ...supplier,
      ordersCount: supplier._count.purchaseOrders,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener proveedor");
  }
}

// PUT - Actualizar proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return errorResponse("No tienes permisos para actualizar proveedores", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const validation = supplierSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Datos de entrada inválidos", 400);
    }

    const data = validation.data;

    // Verificar que el proveedor existe
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return notFoundResponse("Proveedor no encontrado");
    }

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        notes: data.notes,
        updatedAt: new Date(),
      },
    });

    return successResponse(supplier, "Proveedor actualizado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al actualizar proveedor");
  }
}

// DELETE - Eliminar proveedor (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return errorResponse("No tienes permisos para eliminar proveedores", 403);
    }

    const { id } = await params;

    // Verificar que el proveedor existe
    const supplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return notFoundResponse("Proveedor no encontrado");
    }

    // Soft delete
    await db.supplier.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return successResponse(null, "Proveedor eliminado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al eliminar proveedor");
  }
}
