import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { categorySchema } from "@/lib/validations";

// GET - Listar categorías
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return successResponse(
      categories.map((cat) => ({
        ...cat,
        productsCount: cat._count.products,
      }))
    );
  } catch (error) {
    return handleServerError(error, "Error al listar categorías");
  }
}

// POST - Crear categoría
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return errorResponse("No tienes permisos para crear categorías", 403);
    }

    const body = await request.json();
    const validation = categorySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Datos de entrada inválidos", 400);
    }

    const data = validation.data;

    // Verificar nombre único
    const existingCategory = await db.category.findUnique({
      where: { name: data.name },
    });

    if (existingCategory) {
      return errorResponse("Ya existe una categoría con ese nombre", 400);
    }

    const category = await db.category.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    return successResponse(category, "Categoría creada correctamente", 201);
  } catch (error) {
    return handleServerError(error, "Error al crear categoría");
  }
}
