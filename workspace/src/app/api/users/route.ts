import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { hashPassword } from "@/lib/auth";

// GET - Listar usuarios
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Solo admins pueden ver usuarios
    if (user.role !== "ADMIN") {
      return errorResponse("No tienes permisos para ver usuarios", 403);
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(users);
  } catch (error) {
    return handleServerError(error, "Error al listar usuarios");
  }
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    // Solo admins pueden crear usuarios
    if (user.role !== "ADMIN") {
      return errorResponse("No tienes permisos para crear usuarios", 403);
    }

    const body = await request.json();
    const { name, email, password, role, phone } = body;

    // Validaciones
    if (!name || !email || !password) {
      return errorResponse("Nombre, email y contraseña son requeridos", 400);
    }

    if (password.length < 6) {
      return errorResponse("La contraseña debe tener al menos 6 caracteres", 400);
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return errorResponse("El email ya está registrado", 400);
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const newUser = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || "TENDERO",
        phone,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(newUser, "Usuario creado correctamente", 201);
  } catch (error) {
    return handleServerError(error, "Error al crear usuario");
  }
}
