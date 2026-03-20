import { NextRequest } from "next/server";
import { login } from "@/lib/auth";
import { successResponse, errorResponse, handleServerError } from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar entrada
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Datos de entrada inválidos", 400);
    }

    const { email, password } = validation.data;

    // Intentar login
    const result = await login(email, password);

    if (!result) {
      return errorResponse("Credenciales inválidas", 401);
    }

    return successResponse({
      user: result.user,
      token: result.token,
    }, "Sesión iniciada correctamente");
  } catch (error) {
    return handleServerError(error, "Error en login");
  }
}
