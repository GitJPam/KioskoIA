// ============================================
// KIOSKOIA - API: Register User
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import type { ApiResponse, AuthUser } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password, role = 'TENDERO', phone } = body;

    // Validar entrada
    if (!email || !name || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Email, nombre y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
        role,
        phone,
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'TENDERO' | 'PADRE',
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };

    return NextResponse.json<ApiResponse<AuthUser>>(
      {
        success: true,
        data: authUser,
        message: 'Usuario creado exitosamente',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
