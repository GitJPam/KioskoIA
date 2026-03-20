import { NextRequest } from "next/server";
import { logout } from "@/lib/auth";
import { successResponse, handleServerError } from "@/lib/api-helpers";

export async function POST(_request: NextRequest) {
  try {
    await logout();
    return successResponse(null, "Sesión cerrada correctamente");
  } catch (error) {
    return handleServerError(error, "Error en logout");
  }
}
