import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { successResponse, unauthorizedResponse, handleServerError } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedResponse("No autenticado");
    }

    return successResponse({ user });
  } catch (error) {
    return handleServerError(error, "Error al obtener usuario");
  }
}
