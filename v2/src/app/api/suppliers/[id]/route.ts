import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  handleServerError,
} from "@/lib/api-helpers";
import { supplierSchema } from "@/lib/validations";

// GET - Obtener proveedor por ID con estadísticas completas
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

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            orderDate: true,
            paymentStatus: true,
            paidAmount: true,
            pendingAmount: true,
          },
          orderBy: { orderDate: "desc" },
          take: 10,
        },
        supplierDebts: {
          where: {
            status: { in: ["PENDIENTE", "PARCIAL", "VENCIDO"] },
          },
          select: {
            id: true,
            amount: true,
            paidAmount: true,
            pendingAmount: true,
            dueDate: true,
            status: true,
          },
        },
        _count: {
          select: { purchaseOrders: true, supplierDebts: true },
        },
      },
    });

    if (!supplier) {
      return notFoundResponse("Proveedor no encontrado");
    }

    // Calcular estadísticas
    const totalDebt = supplier.supplierDebts.reduce(
      (sum, debt) => sum + debt.pendingAmount,
      0
    );

    // Obtener totales de todas las órdenes (no solo las 10 últimas)
    const orderStats = await db.purchaseOrder.aggregate({
      where: { supplierId: id },
      _count: true,
      _sum: {
        total: true,
        paidAmount: true,
      },
    });

    // Órdenes por estado
    const ordersByStatus = await db.purchaseOrder.groupBy({
      by: ["status"],
      where: { supplierId: id },
      _count: true,
    });

    // Deudas vencidas
    const now = new Date();
    const overdueDebts = supplier.supplierDebts.filter(
      (debt) => debt.dueDate && new Date(debt.dueDate) < now
    );
    const overdueAmount = overdueDebts.reduce(
      (sum, debt) => sum + debt.pendingAmount,
      0
    );

    return successResponse({
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      taxId: supplier.taxId,
      paymentTerms: supplier.paymentTerms,
      notes: supplier.notes,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      // Estadísticas
      stats: {
        totalOrders: orderStats._count,
        totalPurchased: orderStats._sum.total || 0,
        totalPaid: orderStats._sum.paidAmount || 0,
        totalDebt,
        overdueDebts: overdueDebts.length,
        overdueAmount,
        ordersByStatus: ordersByStatus.map((o) => ({
          status: o.status,
          count: o._count,
        })),
      },
      // Datos relacionados
      recentOrders: supplier.purchaseOrders,
      pendingDebts: supplier.supplierDebts,
    });
  } catch (error) {
    return handleServerError(error, "Error al obtener proveedor");
  }
}

// PUT - Actualizar proveedor
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
      return Response.json(
        { success: false, error: "No tienes permisos para actualizar proveedores" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = supplierSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          success: false,
          error: "Datos de entrada inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verificar que el proveedor existe
    const existingSupplier = await db.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return notFoundResponse("Proveedor no encontrado");
    }

    // Verificar nombre duplicado si se está cambiando
    if (data.name !== existingSupplier.name) {
      const duplicateName = await db.supplier.findFirst({
        where: {
          name: data.name,
          NOT: { id },
        },
      });

      if (duplicateName) {
        return Response.json(
          { success: false, error: "Ya existe otro proveedor con este nombre" },
          { status: 400 }
        );
      }
    }

    const supplier = await db.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        taxId: data.taxId || null,
        paymentTerms: data.paymentTerms ?? existingSupplier.paymentTerms,
        notes: data.notes || null,
        isActive: data.isActive ?? existingSupplier.isActive,
        updatedAt: new Date(),
      },
    });

    return successResponse(supplier, "Proveedor actualizado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al actualizar proveedor");
  }
}

// DELETE - Eliminar proveedor (solo si no tiene órdenes ni deudas)
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
      return Response.json(
        { success: false, error: "No tienes permisos para eliminar proveedores" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar que el proveedor existe
    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseOrders: true, supplierDebts: true },
        },
      },
    });

    if (!supplier) {
      return notFoundResponse("Proveedor no encontrado");
    }

    // Verificar si tiene órdenes o deudas
    if (supplier._count.purchaseOrders > 0) {
      return Response.json(
        {
          success: false,
          error: "No se puede eliminar el proveedor porque tiene órdenes de compra asociadas",
        },
        { status: 400 }
      );
    }

    if (supplier._count.supplierDebts > 0) {
      return Response.json(
        {
          success: false,
          error: "No se puede eliminar el proveedor porque tiene deudas registradas",
        },
        { status: 400 }
      );
    }

    // Eliminar permanentemente (no soft delete ya que no tiene relaciones)
    await db.supplier.delete({
      where: { id },
    });

    return successResponse(null, "Proveedor eliminado correctamente");
  } catch (error) {
    return handleServerError(error, "Error al eliminar proveedor");
  }
}
