// KioskoIA - Seed Data
// ============================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de KioskoIA...');

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  // Crear usuarios con bcrypt (igual que auth.ts)
  console.log('👤 Creando usuarios...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@kioskoia.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Usuario admin creado:', admin.email);

  const tenderoPassword = await bcrypt.hash('tendero123', 10);
  const tendero = await prisma.user.create({
    data: {
      email: 'tendero@kioskoia.com',
      name: 'María García',
      password: tenderoPassword,
      role: 'TENDERO',
      phone: '+57 300 123 4567',
      isActive: true,
    },
  });
  console.log('✅ Usuario tendero creado:', tendero.email);

  // Crear categorías
  console.log('📁 Creando categorías...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Galletas',
        description: 'Galletas y dulces',
        color: '#F59E0B',
        icon: 'Cookie',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Bebidas',
        description: 'Jugos, gaseosas y bebidas',
        color: '#3B82F6',
        icon: 'CupSoda',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Snacks',
        description: 'Papas, chicharrones y snacks',
        color: '#EF4444',
        icon: 'Popcorn',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Panadería',
        description: 'Panes, tortas y dulces',
        color: '#8B5CF6',
        icon: 'Croissant',
        sortOrder: 4,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Saludables',
        description: 'Frutas y opciones saludables',
        color: '#10B981',
        icon: 'Apple',
        sortOrder: 5,
      },
    }),
  ]);
  console.log('✅ Categorías creadas:', categories.length);

  // Crear productos
  console.log('📦 Creando productos...');
  const galletas = categories.find(c => c.name === 'Galletas')!;
  const bebidas = categories.find(c => c.name === 'Bebidas')!;
  const snacks = categories.find(c => c.name === 'Snacks')!;
  const panaderia = categories.find(c => c.name === 'Panadería')!;
  const saludables = categories.find(c => c.name === 'Saludables')!;

  const products = [
    // Galletas
    { name: 'Galletas María', sku: 'GAL001', costPrice: 800, salePrice: 1500, stock: 45, minStock: 20, maxStock: 100, categoryId: galletas.id, isHealthy: false },
    { name: 'Galletas Chokis', sku: 'GAL002', costPrice: 1000, salePrice: 1800, stock: 30, minStock: 15, maxStock: 80, categoryId: galletas.id, isHealthy: false },
    { name: 'Galletas Festival', sku: 'GAL003', costPrice: 1200, salePrice: 2000, stock: 25, minStock: 10, maxStock: 60, categoryId: galletas.id, isHealthy: false },
    { name: 'Galletas de Avena', sku: 'GAL004', costPrice: 1500, salePrice: 2500, stock: 15, minStock: 10, maxStock: 40, categoryId: galletas.id, isHealthy: true },

    // Bebidas
    { name: 'Jugo de Naranja Hit', sku: 'BEB001', costPrice: 1200, salePrice: 2000, stock: 35, minStock: 20, maxStock: 80, categoryId: bebidas.id, isHealthy: true },
    { name: 'Jugo de Mora Hit', sku: 'BEB002', costPrice: 1200, salePrice: 2000, stock: 28, minStock: 20, maxStock: 60, categoryId: bebidas.id, isHealthy: true },
    { name: 'Coca-Cola Personal', sku: 'BEB003', costPrice: 1500, salePrice: 2500, stock: 40, minStock: 25, maxStock: 100, categoryId: bebidas.id, isHealthy: false },
    { name: 'Pony Malta', sku: 'BEB004', costPrice: 1000, salePrice: 1800, stock: 32, minStock: 15, maxStock: 70, categoryId: bebidas.id, isHealthy: true },
    { name: 'Agua Cristal', sku: 'BEB005', costPrice: 800, salePrice: 1500, stock: 50, minStock: 30, maxStock: 120, categoryId: bebidas.id, isHealthy: true },

    // Snacks
    { name: 'Papas Margarita', sku: 'SNA001', costPrice: 1500, salePrice: 2500, stock: 22, minStock: 15, maxStock: 50, categoryId: snacks.id, isHealthy: false },
    { name: 'Papas de Plátano', sku: 'SNA002', costPrice: 1200, salePrice: 2000, stock: 18, minStock: 10, maxStock: 40, categoryId: snacks.id, isHealthy: false },
    { name: 'Chicharrón', sku: 'SNA003', costPrice: 1000, salePrice: 1800, stock: 30, minStock: 15, maxStock: 60, categoryId: snacks.id, isHealthy: false },
    { name: 'Maní Salado', sku: 'SNA004', costPrice: 800, salePrice: 1500, stock: 25, minStock: 10, maxStock: 50, categoryId: snacks.id, isHealthy: true },

    // Panadería
    { name: 'Chocoramo', sku: 'PAN001', costPrice: 1500, salePrice: 2500, stock: 28, minStock: 15, maxStock: 50, categoryId: panaderia.id, isHealthy: false },
    { name: 'Ponqué Gala', sku: 'PAN002', costPrice: 2000, salePrice: 3000, stock: 15, minStock: 10, maxStock: 30, categoryId: panaderia.id, isHealthy: false },
    { name: 'Almojábana', sku: 'PAN003', costPrice: 1200, salePrice: 2000, stock: 5, minStock: 10, maxStock: 25, categoryId: panaderia.id, isHealthy: true },
    { name: 'Buñuelo', sku: 'PAN004', costPrice: 1000, salePrice: 1800, stock: 3, minStock: 10, maxStock: 25, categoryId: panaderia.id, isHealthy: true },

    // Saludables
    { name: 'Manzana', sku: 'SAL001', costPrice: 800, salePrice: 1500, stock: 20, minStock: 10, maxStock: 40, categoryId: saludables.id, isHealthy: true },
    { name: 'Banano', sku: 'SAL002', costPrice: 500, salePrice: 1000, stock: 25, minStock: 15, maxStock: 50, categoryId: saludables.id, isHealthy: true },
    { name: 'Yogurt', sku: 'SAL003', costPrice: 1800, salePrice: 2800, stock: 12, minStock: 8, maxStock: 30, categoryId: saludables.id, isHealthy: true },
    { name: 'Barra de Granola', sku: 'SAL004', costPrice: 1500, salePrice: 2500, stock: 18, minStock: 10, maxStock: 40, categoryId: saludables.id, isHealthy: true },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log('✅ Productos creados:', products.length);

  // Crear proveedor
  console.log('🏪 Creando proveedor...');
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Distribuidora Escolar del Valle',
      contactName: 'Carlos Rodríguez',
      phone: '+57 318 555 1234',
      email: 'pedidos@distribuidoravalle.com',
      address: 'Calle 5 # 20-30, Palmira, Valle',
      notes: 'Entrega los martes y viernes',
      isActive: true,
    },
  });
  console.log('✅ Proveedor creado:', supplier.name);

  // Crear configuraciones
  console.log('⚙️ Creando configuraciones...');
  await prisma.setting.createMany({
    data: [
      { key: 'store_name', value: 'Kiosko Escolar - Colegio Demo', description: 'Nombre de la tienda' },
      { key: 'store_address', value: 'Palmira, Valle del Cauca', description: 'Dirección' },
      { key: 'currency', value: 'COP', description: 'Moneda' },
      { key: 'currency_symbol', value: '$', description: 'Símbolo de moneda' },
    ],
  });
  console.log('✅ Configuraciones creadas');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Credenciales de acceso:');
  console.log('   Admin: admin@kioskoia.com / admin123');
  console.log('   Tendero: tendero@kioskoia.com / tendero123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
