import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  handleServerError,
} from "@/lib/api-helpers";

// GET - Obtener usuario por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    if (user.role !== "ADMIN") {
      return errorResponse("No tienes permisos para ver usuarios", 403);
    }

    const { id } = await params;

    const foundUser = await db.user.findUnique({
      where: { id },
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

    if (!foundUser) {
      return notFoundResponse("Usuario no encontrado");
    }

    return successResponse(foundUser);
  } catch (error) {
    return handleServerError(error, "Error al obtener usuario");
  }
}

// PUT - Actualizar usuario
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
      return errorResponse("No tienes permisos para actualizar usuarios", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, role, phone, password, isActive } = body;

    // Verificar que el usuario existe
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse("Usuario no encontrado");
    }

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    if (email && email !== existingUser.email) {
      // Verificar que el nuevo email no esté en uso
      const emailInUse = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (emailInUse && emailInUse.id !== id) {
        return errorResponse("El email ya está en uso", 400);
      }
      updateData.email = email.toLowerCase();
    }

    if (password) {
      if (password.length < 6) {
        return errorResponse("La contraseña debe tener al menos 6 caracteres", 400);
      }
      updateData.password = await hashPassword(password);
    }

    // Actualizar usuario
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
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

    return successResponse(updatedUser, "Usuario actualizado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al actualizar usuario");
  }
}

// DELETE - Eliminar usuario
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
      return errorResponse("No tienes permisos para eliminar usuarios", 403);
    }

    const { id } = await params;

    // No permitir eliminarse a sí mismo
    if (id === user.id) {
      return errorResponse("No puedes eliminar tu propia cuenta", 400);
    }

    // Verificar que el usuario existe
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse("Usuario no encontrado");
    }

    // Eliminar usuario
    await db.user.delete({
      where: { id },
    });

    return successResponse(null, "Usuario eliminado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al eliminar usuario");
  }
}
