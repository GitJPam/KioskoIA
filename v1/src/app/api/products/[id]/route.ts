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
import { productUpdateSchema } from "@/lib/validations";

// GET - Obtener producto por ID
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

    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!product) {
      return notFoundResponse("Producto no encontrado");
    }

    return successResponse(product);
  } catch (error) {
    return handleServerError(error, "Error al obtener producto");
  }
}

// PUT - Actualizar producto
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
      return errorResponse("No tienes permisos para actualizar productos", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const validation = productUpdateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Datos de entrada inválidos", 400);
    }

    const data = validation.data;

    // Verificar que el producto existe
    const existingProduct = await db.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return notFoundResponse("Producto no encontrado");
    }

    // Verificar SKU único si se está cambiando
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuExists = await db.product.findUnique({
        where: { sku: data.sku },
      });
      if (skuExists) {
        return errorResponse("El SKU ya está en uso", 400);
      }
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        category: true,
      },
    });

    return successResponse(product, "Producto actualizado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al actualizar producto");
  }
}

// DELETE - Eliminar producto
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
      return errorResponse("No tienes permisos para eliminar productos", 403);
    }

    const { id } = await params;

    // Verificar que el producto existe
    const product = await db.product.findUnique({
      where: { id },
    });

    if (!product) {
      return notFoundResponse("Producto no encontrado");
    }

    // Soft delete: marcar como no disponible
    await db.product.update({
      where: { id },
      data: {
        isAvailable: false,
        updatedAt: new Date(),
      },
    });

    return successResponse(null, "Producto eliminado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al eliminar producto");
  }
}
