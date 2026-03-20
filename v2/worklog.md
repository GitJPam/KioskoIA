# KioskoIA - Worklog

---
Task ID: 1
Agent: Main Developer
Task: Implement KioskoIA - Sistema Inteligente de Gestión de Tiendas Escolares

Work Log:
- Created complete Prisma schema with all models (Users, Products, Categories, Sales, Inventory, Suppliers, etc.)
- Created seed script with initial data (categories, products, suppliers, demo users)
- Implemented authentication system (login, logout, session management)
- Created API endpoints for:
  - Authentication (/api/auth/*)
  - Products (/api/products/*)
  - Categories (/api/categories)
  - Sales (/api/sales/*)
  - Inventory (/api/inventory/*)
  - Reports (/api/reports/*)
  - AI predictions (/api/ai/*)
  - Suppliers (/api/suppliers/*)
- Created Zustand stores for state management (auth, cart, sync, UI)
- Created layout components (AppShell, Sidebar, Header, OfflineIndicator)
- Created dashboard components (StatsCards, AlertsPanel, TopProducts, AIPredictions, SalesChart)
- Created pages:
  - Login page with demo credentials
  - Dashboard with real-time stats
  - Nueva Venta (POS) page
  - Inventario page with stock management
  - IA page with predictions and suggestions
  - Ventas (Reports) page
  - Proveedores page
  - Configuracion page

Stage Summary:
- Complete MVP for KioskoIA is implemented
- All core features working: sales, inventory, reports, AI predictions
- Offline-first architecture with Zustand persist
- Responsive design with Tailwind CSS and shadcn/ui
- Ready for database migration and testing

---
Task ID: 6
Agent: full-stack-developer
Task: Crear APIs de Proveedores mejoradas

Work Log:
- Mejorada API de proveedores (`/api/suppliers/route.ts`):
  - Implementada paginación con parámetros `page` y `limit`
  - Añadido filtro de búsqueda en nombre, contacto, teléfono, email y NIT
  - Incluido cálculo de `totalDebt` sumando deudas pendientes
  - Añadido soporte para incluir/excluir proveedores inactivos
  - Creada validación para nombres duplicados al crear

- Mejorada API de proveedor por ID (`/api/suppliers/[id]/route.ts`):
  - Implementadas estadísticas completas: total órdenes, total comprado, total pagado
  - Cálculo de deuda total y deudas vencidas
  - Distribución de órdenes por estado
  - Validación antes de eliminar: no permite si tiene órdenes o deudas asociadas
  - Eliminación permanente en lugar de soft delete cuando no tiene relaciones

- Creada API de órdenes de compra (`/api/purchase-orders/route.ts`):
  - GET: Listar órdenes con filtros por supplierId, status, paymentStatus, fechas
  - POST: Crear orden con generación automática de número (OC-00001)
  - Cálculo automático de subtotal, impuesto (19% IVA) y total
  - Creación automática de deuda al proveedor si tiene fecha de vencimiento
  - Transacción atómica para crear orden con sus items

- Creada API de orden de compra por ID (`/api/purchase-orders/[id]/route.ts`):
  - GET: Detalle completo con items, productos y estadísticas de recepción
  - PUT: Actualizar estado y fechas, o recibir productos
  - Recepción de productos con actualización de inventario:
    - Crea InventoryLog por cada producto recibido
    - Actualiza stock y precio de costo del producto
    - Cambia estado de orden a RECIBIDO_PARCIAL o RECIBIDO_COMPLETO
  - DELETE: Cancelar orden si no hay productos recibidos

- Creada API de deudas (`/api/supplier-debts/route.ts`):
  - GET: Listar deudas con filtros por proveedor, estado y vencimiento
  - Cálculo de días de vencimiento para cada deuda
  - Estadísticas agregadas: total deudas, monto total, pagado, pendiente, vencidas

- Creada API de pagos (`/api/supplier-debts/[id]/payment/route.ts`):
  - POST: Registrar pago parcial o total a proveedor
  - Actualización automática del estado de deuda (PENDIENTE, PARCIAL, PAGADO)
  - Sincronización con la orden de compra asociada
  - Registro de actividad para auditoría

- Actualizado archivo de validaciones (`/lib/validations.ts`):
  - Añadidos campos `taxId` y `paymentTerms` al schema de supplier
  - Creados schemas para actualización de órdenes de compra
  - Creado schema para recepción de productos
  - Creado schema para pagos a proveedores

Stage Summary:
- APIs creadas/modificadas:
  - `src/app/api/suppliers/route.ts` - Mejorada con paginación y totalDebt
  - `src/app/api/suppliers/[id]/route.ts` - Mejorada con estadísticas completas
  - `src/app/api/purchase-orders/route.ts` - Nueva API para listar/crear órdenes
  - `src/app/api/purchase-orders/[id]/route.ts` - Nueva API para detalle/actualizar/eliminar
  - `src/app/api/supplier-debts/route.ts` - Nueva API para listar deudas
  - `src/app/api/supplier-debts/[id]/payment/route.ts` - Nueva API para registrar pagos
  - `src/lib/validations.ts` - Añadidas validaciones para nuevas funcionalidades
- Todas las APIs compilan correctamente sin errores
- Listas para integración con el frontend

---
Task ID: 8
Agent: full-stack-developer
Task: Crear APIs de Sistema de Fiado

Work Log:
- Agregadas validaciones para Customer y CreditPayment en src/lib/validations.ts
- Creada API de clientes: src/app/api/customers/route.ts
  - GET: Listar clientes con búsqueda, paginación y cálculo de saldo pendiente
  - POST: Crear nuevo cliente con validación de email duplicado
- Creada API de cliente por ID: src/app/api/customers/[id]/route.ts
  - GET: Detalle del cliente con saldo pendiente y ventas pendientes
  - PUT: Actualizar cliente con validación de email duplicado
  - DELETE: Eliminar cliente (soft delete si tiene ventas, hard delete si no)
- Creada API de créditos/fiados: src/app/api/credits/route.ts
  - GET: Listar todos los créditos pendientes con filtros por customerId y estado
  - Incluye cálculo de saldo pendiente por venta y estado del crédito
- Creada API de pagos de crédito: src/app/api/credits/payments/route.ts
  - GET: Historial de pagos con filtros por customerId y saleId
  - POST: Registrar pago de crédito con validación de saldo pendiente
  - Actualiza automáticamente el estado de la venta a COMPLETADA cuando se paga totalmente
- Creada API de saldo de cliente: src/app/api/customers/[id]/balance/route.ts
  - GET: Obtener saldo pendiente, límite de crédito, crédito disponible
  - Incluye información de créditos vencidos y porcentaje de uso de crédito

Stage Summary:
- Archivos creados:
  - src/app/api/customers/route.ts
  - src/app/api/customers/[id]/route.ts
  - src/app/api/customers/[id]/balance/route.ts
  - src/app/api/credits/route.ts
  - src/app/api/credits/payments/route.ts
- Archivos modificados:
  - src/lib/validations.ts (agregadas validaciones para Customer y CreditPayment)
- APIs completas para gestión de fiado:
  - CRUD completo de clientes
  - Cálculo de saldo pendiente (ventas a crédito - pagos)
  - Gestión de límite de crédito
  - Historial de pagos
  - Validación de pagos (no exceder saldo pendiente)

---
Task ID: 4
Agent: full-stack-developer
Task: Crear APIs de Cierre de Caja

Work Log:
- Leído worklog previo para entender el contexto del proyecto
- Analizado el schema de Prisma para el modelo CashRegister y RegisterStatus
- Revisadas las APIs existentes y los helpers de API disponibles
- Creada API de caja principal (/api/cash-register/route.ts):
  - GET: Obtener caja actual abierta con datos del usuario
  - POST: Abrir nueva caja con monto inicial
  - Validación: verificar que no exista una caja abierta antes de crear
  - Registro de actividad en el log de auditoría
- Creada API de cierre de caja (/api/cash-register/close/route.ts):
  - POST: Cerrar caja actual con monto de efectivo real
  - Cálculo automático de ventas por método de pago (EFECTIVO, TARJETA, NEQUI, DAVIPLATA, TRANSFERENCIA, OTRO)
  - Cálculo de efectivo esperado vs real y diferencia
  - Determinación automática del estado: CUADRADA (diferencia = 0) o DESCUADRADA
  - Incluye pagos de fiados recibidos (totalInPayments)
- Creada API de historial (/api/cash-register/history/route.ts):
  - GET: Listar historial de cierres con paginación
  - Filtros por fecha (dateFrom, dateTo) y estado
  - Estadísticas del período (totales, promedios, tasa de cuadre)
- Creada API por ID (/api/cash-register/[id]/route.ts):
  - GET: Detalle completo de una caja con ventas del período
  - PUT: Actualizar notas o corregir valores de efectivo real
  - Opción de forzar recálculo de ventas (forceRecalculate)
  - Validación: no se puede corregir efectivo de una caja abierta

Stage Summary:
- Archivos creados:
  - src/app/api/cash-register/route.ts (GET caja actual, POST abrir caja)
  - src/app/api/cash-register/close/route.ts (POST cerrar caja)
  - src/app/api/cash-register/history/route.ts (GET historial con paginación)
  - src/app/api/cash-register/[id]/route.ts (GET detalle, PUT actualizar)
- Funcionalidades implementadas:
  - Apertura de caja con monto inicial
  - Cierre automático con cálculo de ventas por método de pago
  - Sistema de cuadre (CUADRADA/DESCUADRADA)
  - Historial con filtros y estadísticas
  - Corrección de valores post-cierre
  - Registro de actividades de auditoría
- Todas las APIs usan autenticación y helpers estándar del proyecto

---
Task ID: 2
Agent: full-stack-developer
Task: Crear APIs de Reportes de Ventas

Work Log:
- Leído worklog previo para entender el contexto del proyecto KioskoIA
- Analizado el schema de Prisma: Sale, SaleItem, Product, Customer, CashRegister, Supplier, PurchaseOrder
- Revisadas las APIs existentes de reportes (daily, weekly, monthly, top-products, comparative)
- Creada API de resumen general: src/app/api/reports/route.ts
  - GET: Resumen completo con parámetros de fecha (from, to) y período (day, week, month)
  - Incluye: totalVentas, totalGanancias, totalProductos, numTransacciones
  - Comparación con período anterior (cambios porcentuales)
  - Desglose por método de pago, estado de pago y ventas por día
- Creada API de ventas por período: src/app/api/reports/sales/route.ts
  - GET: Ventas agrupadas por día/semana/mes según parámetro period
  - Incluye: fecha, total, ganancia, numVentas, productos
  - Análisis: mejor y peor período, tendencia (primera vs segunda mitad)
  - Promedios calculados automáticamente
- Mejorada API de productos más vendidos: src/app/api/reports/top-products/route.ts
  - GET: Top productos con filtros from, to, limit, sortBy
  - Ordenamiento por: cantidad (quantity), ingresos (revenue), ganancia (profit)
  - Incluye: topByQuantity, topByRevenue, topByProfit
  - Desglose por categoría con estadísticas
- Creada API de ganancias y pérdidas: src/app/api/reports/profits/route.ts
  - GET: Resumen completo de ingresos, costos, ganancias
  - Desglose por categoría con margen calculado
  - Desglose por método de pago con porcentaje de participación
  - Productos con bajo rendimiento (margen < 10%)
  - Top productos por ganancia
  - Comparación con período anterior
  - Información de créditos/fiados
- Creada API de exportación: src/app/api/reports/export/route.ts
  - GET: Exportar datos a CSV o JSON
  - Tipos soportados: sales (ventas detalladas), products (productos vendidos), profits (ganancias diarias)
  - CSV con BOM para compatibilidad con Excel
  - Descarga con nombre de archivo dinámico

Stage Summary:
- Archivos creados:
  - src/app/api/reports/route.ts (resumen general)
  - src/app/api/reports/sales/route.ts (ventas por período)
  - src/app/api/reports/profits/route.ts (ganancias y pérdidas)
  - src/app/api/reports/export/route.ts (exportación CSV/JSON)
- Archivos modificados:
  - src/app/api/reports/top-products/route.ts (agregados filtros from/to, sortBy, topByRevenue, topByProfit)
- Funcionalidades implementadas:
  - Reportes con filtros por rango de fechas
  - Cálculo de ganancias (precio venta - precio costo)
  - Comparación con período anterior
  - Agrupación por día/semana/mes
  - Desglose por categoría y método de pago
  - Exportación a CSV y JSON
  - Identificación de productos con bajo margen

---
Task ID: 5
Agent: full-stack-developer
Task: Crear página de Cierre de Caja

Work Log:
- Leído worklog previo para entender el contexto del proyecto
- Analizadas las APIs de cierre de caja creadas en Task ID 4
- Revisados los componentes disponibles de shadcn/ui y el layout AppShell
- Creada página completa de Cierre de Caja en `src/app/caja/page.tsx`:
  - Estado de caja actual:
    - Si no hay caja abierta: formulario para abrir con monto inicial y notas
    - Si hay caja abierta: resumen con fecha/hora, monto inicial, tiempo transcurrido
    - Botón "Cerrar Caja" que muestra el formulario de cierre
  - Formulario de cierre de caja:
    - Resumen automático de ventas por método de pago (efectivo, Nequi, Daviplata, tarjeta, transferencia, otros)
    - Cálculo automático de efectivo esperado (inicial + ventas efectivo)
    - Campo para efectivo real contado
    - Cálculo y visualización de diferencia con colores (verde cuadrada, azul sobrante, rojo faltante)
    - Campo para notas del cierre
  - Historial de cierres:
    - Tabla con columnas: fecha, usuario, ventas totales, efectivo esperado, efectivo real, diferencia, estado
    - Badges de estado con colores: CUADRADA (verde), DESCUADRADA (rojo), ABIERTA (amarillo)
    - Filtros por fecha (desde/hasta) y estado
    - Paginación
    - Click en fila para ver detalle
  - Modal de detalle:
    - Información general: apertura, cierre, usuario, estado
    - Estadísticas: número de ventas, productos vendidos, ticket promedio, total
    - Desglose por método de pago con colores distintivos
    - Resumen de cuadre con montos
    - Lista de últimas ventas del período
- Usado AppShell para layout consistente
- Usado componentes shadcn/ui: Card, Button, Input, Label, Badge, Table, Dialog, Select, Textarea
- Usado Sonner para notificaciones (toast)
- Formateo de moneda con Intl.NumberFormat para COP
- Diseño responsive (mobile-first)
- Colores de estado: emerald (cuadrada), red (descuadrada), amber (abierta)

Stage Summary:
- Archivos creados:
  - src/app/caja/page.tsx (página completa de Cierre de Caja)
- Funcionalidades implementadas:
  - Apertura de caja con monto inicial
  - Visualización de estado de caja abierta con tiempo transcurrido
  - Cierre de caja con resumen automático de ventas
  - Cálculo de diferencia y determinación de estado
  - Historial paginado con filtros
  - Modal de detalle completo
  - Interfaz responsive y moderna

---
Task ID: 7
Agent: full-stack-developer
Task: Mejorar página de Proveedores

Work Log:
- Leído worklog previo para entender el contexto del proyecto KioskoIA
- Analizadas las APIs existentes de proveedores, órdenes de compra y deudas (creadas en Task ID 6)
- Revisados los componentes de shadcn/ui disponibles y el layout AppShell
- Creada página completa de Proveedores con tabs en `src/app/proveedores/page.tsx`:

  **Tab "Proveedores":**
  - Tarjetas de estadísticas: total proveedores, activos, con órdenes, deuda total
  - Barra de búsqueda para filtrar proveedores
  - Botón "Nuevo Proveedor" (solo visible para ADMIN)
  - Tabla con columnas: nombre, NIT, contacto, teléfono, deuda total, estado
  - Botones de acción: ver detalle, editar, eliminar
  - Modal de creación/edición con campos: nombre, NIT, días de crédito, contacto, teléfono, email, dirección, notas
  - Modal de detalle con:
    - Información de contacto
    - Estadísticas: total órdenes, total comprado, total pagado, deuda actual, deudas vencidas
    - Tabla de órdenes recientes
    - Tabla de deudas pendientes
  - Confirmación de eliminación con validación de dependencias

  **Tab "Órdenes de Compra":**
  - Filtros: proveedor, estado (pendiente, enviado, recibido parcial, recibido, cancelado), búsqueda
  - Botón "Nueva Orden" (solo visible para ADMIN)
  - Tabla con columnas: número, proveedor, fecha, total, estado, estado de pago
  - Modal para crear orden:
    - Selector de proveedor
    - Fechas esperada y de vencimiento del pago
    - Agregar productos con cantidad y costo unitario
    - Cálculo automático de subtotal, IVA (19%) y total
    - Campo para notas
  - Modal de detalle de orden:
    - Información general: proveedor, estado, total
    - Fechas: orden, esperada, vencimiento pago
    - Barra de progreso de recepción
    - Tabla de productos con cantidad, costo, recibido y subtotal
    - Formulario para recibir productos (solo para ADMIN y órdenes pendientes/parciales)
    - Actualización automática del inventario al recibir

  **Tab "Deudas":**
  - Tarjetas de estadísticas: total deudas, vencidas (con resaltado rojo), pagado, por vencer
  - Tabla con columnas: proveedor, orden, monto original, pagado, pendiente, vencimiento, estado
  - Resaltado en rojo para deudas vencidas
  - Días de vencimiento mostrados para deudas vencidas
  - Botón "Pagar" para cada deuda pendiente
  - Modal de pago:
    - Resumen: proveedor, orden, monto original, pagado, pendiente
    - Campo para monto a pagar
    - Botones rápidos: "Pago Total" y "50%"
    - Campo para notas del pago

- Usado AppShell para layout consistente
- Usado componentes shadcn/ui: Card, Button, Input, Label, Badge, Table, Dialog, AlertDialog, Tabs, Select, Textarea, ScrollArea
- Usado Sonner para notificaciones (toast)
- Formateo de moneda con Intl.NumberFormat para COP
- Formateo de fechas con Intl.DateTimeFormat
- Estados con colores:
  - Ordenes: PENDIENTE (amarillo), ENVIADO (azul), RECIBIDO_PARCIAL (morado), RECIBIDO_COMPLETO (verde), CANCELADO (gris)
  - Pago: PENDIENTE (amarillo), COMPLETADA (verde), CANCELADA (gris)
  - Deuda: PENDIENTE (amarillo), PARCIAL (azul), PAGADO (verde), VENCIDO (rojo)
- Diseño responsive y tablas con scroll
- Validación de permisos (solo ADMIN puede crear/editar/eliminar/pagar)

Stage Summary:
- Archivos modificados:
  - src/app/proveedores/page.tsx (página completa de gestión de proveedores)
- Funcionalidades implementadas:
  - Gestión completa de proveedores (CRUD)
  - Gestión de órdenes de compra con creación y recepción
  - Visualización y pago de deudas
  - Filtros y búsqueda en cada tab
  - Modales para todas las operaciones
  - Actualización automática de inventario al recibir productos
  - Interfaz moderna con tabs y responsive

---
Task ID: 3
Agent: full-stack-developer
Task: Crear página de Reportes

Work Log:
- Leído worklog previo para entender el contexto del proyecto KioskoIA
- Analizadas las APIs de reportes creadas en Task ID 2 (resumen, ventas, top-products, profits, export)
- Revisados los componentes disponibles de shadcn/ui y el layout AppShell
- Creada página completa de Reportes de Ventas en `src/app/reportes/page.tsx`:
  
  1. Header con filtros de fecha:
     - Botones rápidos: Hoy, Semana, Mes, Año
     - Selector de rango de fechas (desde/hasta)
     - Selector de agrupación (día/semana/mes) para gráficos
     - Botones de exportación CSV/JSON
  
  2. Tarjetas de resumen:
     - Total Ventas con badge de cambio porcentual
     - Total Ganancias con badge de cambio porcentual
     - Número de Transacciones con badge de cambio porcentual
     - Productos Vendidos con badge de cambio porcentual
     - Margen de ganancia % y ticket promedio
     - Badges con colores: emerald (positivo), red (negativo), gray (sin cambio)
  
  3. Gráfico de ventas por período:
     - Gráfico de barras con Recharts
     - Muestra ventas y ganancias en barras separadas
     - Eje X con labels rotados para mejor legibilidad
     - Tooltip con formato de moneda COP
     - Leyenda interactiva
     - Descripción con mejor período identificado
  
  4. Sección de productos más vendidos:
     - Tabs para ordenar por: Cantidad, Ingresos, Ganancia
     - Tabla con columnas: ranking, producto, categoría, cantidad, ingresos, ganancia
     - Badges de ranking con colores (oro, plata, bronce)
     - ScrollArea para manejar listas largas
  
  5. Sección de ganancias y pérdidas:
     - Ingresos Netos con badge de cambio
     - Costo de Ventas con badge de cambio
     - Ganancia Bruta destacada con margen %
     - Desglose por categoría con colores
     - Información de descuentos
  
  6. Desglose por método de pago:
     - Grid de tarjetas con cada método
     - Efectivo, Tarjeta, Nequi, Daviplata, Transferencia, Otro
     - Muestra ingresos, número de ventas y porcentaje
  
  7. Productos con bajo rendimiento:
     - Tabla de productos con margen < 10%
     - Columnas: producto, categoría, ingresos, costos, ganancia, margen
     - Badge rojo para indicar bajo rendimiento
  
- Usado AppShell para layout consistente
- Usado componentes shadcn/ui: Card, Button, Badge, Table, Select, Input, Label, ScrollArea
- Usado Recharts para gráficos (BarChart, Legend, Tooltip, etc.)
- Usado Sonner para notificaciones (toast)
- Formateo de moneda con Intl.NumberFormat para COP
- Diseño responsive (mobile-first)
- Colores: emerald para positivos, red para negativos

Stage Summary:
- Archivos creados:
  - src/app/reportes/page.tsx (página completa de Reportes de Ventas)
- Funcionalidades implementadas:
  - Filtros de fecha con botones rápidos y rango personalizado
  - Tarjetas de resumen con comparación de período anterior
  - Gráfico interactivo de ventas y ganancias
  - Tabla de productos más vendidos con múltiples ordenamientos
  - Resumen de ganancias y pérdidas con desglose
  - Desglose por método de pago
  - Identificación de productos con bajo rendimiento
  - Exportación a CSV y JSON
  - Interfaz responsive y moderna
- Todas las APIs de reportes integradas correctamente

---
Task ID: 9
Agent: full-stack-developer
Task: Crear página de Fiados/Clientes

Work Log:
- Leído worklog previo para entender el contexto del proyecto KioskoIA
- Analizadas las APIs de Sistema de Fiado creadas en Task ID 8 (customers, credits, payments)
- Revisados los componentes de shadcn/ui disponibles y el layout AppShell
- Creada página completa de Sistema de Fiado en `src/app/fiados/page.tsx`:

  **Tab "Clientes":**
  - Tarjetas de estadísticas: total clientes, clientes activos, con crédito pendiente, sobre límite
  - Barra de búsqueda para filtrar por nombre, teléfono o email
  - Botón "Nuevo Cliente" (solo visible para ADMIN)
  - Tabla con columnas: nombre, teléfono, límite de crédito, saldo pendiente, estado
  - Resaltado en rojo para clientes que exceden su límite de crédito
  - Botones de acción: ver detalle, registrar pago, editar
  - Modal de creación/edición con campos: nombre, teléfono, email, dirección, límite de crédito, notas
  - Modal de detalle con:
    - Información de contacto
    - Estadísticas: límite de crédito, saldo pendiente, total ventas, total pagos
    - Botón para registrar pago

  **Tab "Créditos":**
  - Tarjetas de estadísticas: total en créditos, créditos vencidos, clientes con crédito
  - Filtros: cliente y estado (todos, pendiente, pagado)
  - Tabla con columnas:
    - Cliente con teléfono
    - Número de factura
    - Fecha de venta
    - Monto original
    - Abonado (verde)
    - Saldo pendiente
    - Fecha de vencimiento (resaltado en rojo si vencido)
    - Estado (PENDIENTE/VENCIDO/PAGADO con colores)
  - Botones de acción: ver detalle, registrar pago
  - Modal de detalle de crédito:
    - Información general: factura, fecha, cliente
    - Montos: original, abonado, pendiente
    - Lista de productos de la venta
    - Botón para registrar pago

  **Tab "Pagos":**
  - Tarjetas de estadísticas: total abonos recibidos, total de abonos
  - Filtros: cliente y fecha
  - Tabla con columnas: fecha/hora, cliente, monto, método de pago, venta relacionada, notas
  - Montos resaltados en verde para abonos

  **Modal de Registro de Pago:**
  - Selector de cliente (solo clientes con crédito pendiente)
  - Selector de venta a abonar (muestra número de factura y saldo)
  - Información detallada de la venta seleccionada: factura, fecha, montos
  - Campo para monto del abono (pre-poblando con saldo pendiente)
  - Selector de método de pago (Efectivo, Nequi, Daviplata, Transferencia, Tarjeta, Otro)
  - Campo para notas

- Usado AppShell para layout consistente
- Usado componentes shadcn/ui: Card, Button, Input, Label, Badge, Table, Dialog, Tabs, Select, Textarea, ScrollArea
- Usado Sonner para notificaciones (toast)
- Formateo de moneda con Intl.NumberFormat para COP
- Formateo de fechas con Intl.DateTimeFormat
- Estados con colores:
  - Créditos: PENDIENTE (amarillo), VENCIDO (rojo), PAGADO (verde)
  - Clientes: Activo (default), Inactivo (secondary)
- Resaltado en rojo para clientes que exceden límite de crédito
- Diseño responsive y tablas con scroll
- Validación de permisos (solo ADMIN puede crear/editar clientes)

Stage Summary:
- Archivos creados:
  - src/app/fiados/page.tsx (página completa de Sistema de Fiado)
- Funcionalidades implementadas:
  - Gestión completa de clientes con CRUD
  - Visualización de créditos pendientes con filtros
  - Historial de pagos recibidos
  - Modal de registro de pago con selección de cliente y venta
  - Cálculo automático de saldos y estados
  - Resaltado visual para clientes sobre límite y créditos vencidos
  - Interfaz moderna con tabs y responsive
