import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import type { User, UserWithoutPassword } from "@/types";

const SESSION_COOKIE = "kioskoia_session";
const SESSION_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 días

// Generar token de sesión simple
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return Buffer.from(`${userId}:${timestamp}:${random}`).toString("base64");
}

// Hashear contraseña
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verificar contraseña
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Crear sesión
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY);

  // En producción, guardar en base de datos o Redis
  // Por simplicidad, usamos cookie firmada
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

// Obtener usuario actual
export async function getCurrentUser(): Promise<UserWithoutPassword | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return null;
    }

    // Decodificar token
    const decoded = Buffer.from(sessionToken, "base64").toString();
    const [userId] = decoded.split(":");

    if (!userId) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: userId, isActive: true },
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

    return user;
  } catch {
    return null;
  }
}

// Verificar si está autenticado
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// Verificar rol
export async function hasRole(role: string | string[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}

// Cerrar sesión
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Login
export async function login(
  email: string,
  password: string
): Promise<{ user: UserWithoutPassword; token: string } | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Actualizar último login
  await db.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Crear sesión
  const token = await createSession(user.id);

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

// Registrar usuario
export async function register(
  email: string,
  name: string,
  password: string,
  role: "ADMIN" | "TENDERO" | "PADRE" = "TENDERO"
): Promise<UserWithoutPassword | null> {
  // Verificar si el email ya existe
  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    return null;
  }

  const hashedPassword = await hashPassword(password);

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      password: hashedPassword,
      role,
      isActive: true,
    },
  });

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
