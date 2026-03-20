import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { productSchema } from "@/lib/validations";

// GET - Listar productos
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const available = searchParams.get("available");

    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Record<string, unknown> = {};
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }
    
    if (available === "true") {
      where.isAvailable = true;
    }

    // Obtener productos
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    return paginatedResponse(products, page, limit, total);
  } catch (error) {
    return handleServerError(error, "Error al listar productos");
  }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return errorResponse("No tienes permisos para crear productos", 403);
    }

    const body = await request.json();
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse("Datos de entrada inválidos", 400);
    }

    const data = validation.data;

    // Verificar que la categoría existe
    const category = await db.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      return errorResponse("Categoría no encontrada", 404);
    }

    // Verificar SKU único si se proporciona
    if (data.sku) {
      const existingSku = await db.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        return errorResponse("El SKU ya está en uso", 400);
      }
    }

    const product = await db.product.create({
      data: {
        name: data.name,
        description: data.description,
        sku: data.sku,
        barcode: data.barcode,
        categoryId: data.categoryId,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        stock: data.stock,
        minStock: data.minStock,
        maxStock: data.maxStock,
        isHealthy: data.isHealthy,
        isAvailable: data.isAvailable,
        image: data.image,
      },
      include: {
        category: true,
      },
    });

    // Registrar log de inventario inicial
    if (data.stock > 0) {
      await db.inventoryLog.create({
        data: {
          productId: product.id,
          changeType: "COMPRA",
          quantity: data.stock,
          reason: "Stock inicial",
          previousStock: 0,
          newStock: data.stock,
          userId: user.id,
        },
      });
    }

    return successResponse(product, "Producto creado correctamente", 201);
  } catch (error) {
    return handleServerError(error, "Error al crear producto");
  }
}
