# 📱 KioskoIA - Guía de Instalación y Uso

## 📦 Descargar el Proyecto

El archivo ZIP está disponible en: **`public/download/kioskoia-proyecto.zip`**

---

## 💻 INSTALACIÓN EN PC LOCAL

### Requisitos Previos
- **Node.js 18+** o **Bun** (recomendado)
- **Sistema Operativo:** Windows, macOS o Linux

### Paso a Paso

#### 1. Descomprimir el proyecto
```bash
unzip kioskoia-proyecto.zip
cd my-project
```

#### 2. Instalar dependencias
```bash
# Con Bun (recomendado - más rápido)
bun install

# O con npm
npm install
```

#### 3. Configurar base de datos
```bash
# Generar cliente Prisma
bunx prisma generate

# Crear base de datos
bunx prisma db push

# Poblar con datos de prueba
bunx tsx prisma/seed.ts
```

#### 4. Iniciar la aplicación
```bash
bun run dev
```

#### 5. Acceder en el navegador
- Abrir: **http://localhost:3000**
- Credenciales:
  - **Admin:** admin@kioskoia.com / admin123
  - **Tendero:** tendero@kioskoia.com / tendero123

---

## 📱 INSTALACIÓN EN CELULAR (PWA)

KioskoIA es una **Progressive Web App (PWA)**, lo que significa que se puede instalar como una aplicación nativa en tu celular.

### Android (Chrome)

1. **Conectar al mismo WiFi** que la PC donde corre el servidor
2. Abrir Chrome en el celular
3. Ir a: `http://[IP-DE-TU-PC]:3000`
   - Ejemplo: `http://192.168.1.100:3000`
4. Esperar que cargue la página
5. Chrome mostrará un banner: **"¿Instalar KioskoIA?"**
6. Tocar **"Instalar"** o ir a:
   - Menú (⋮) → "Añadir a pantalla de inicio"

### iOS (Safari)

1. **Conectar al mismo WiFi** que la PC
2. Abrir Safari en el iPhone/iPad
3. Ir a: `http://[IP-DE-TU-PC]:3000`
4. Tocar el botón **Compartir** (cuadrado con flecha)
5. Seleccionar **"Añadir a pantalla de inicio"**
6. Nombrar la app y tocar **"Añadir"**

### Encontrar tu IP local

**Windows:**
```cmd
ipconfig
```
Busca "IPv4 Address" (ej: 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
# o
ip addr show
```

---

## 🔄 SINCRONIZACIÓN OFFLINE

### ¿Cómo funciona?

KioskoIA implementa un sistema de **sincronización offline-first**:

```
┌─────────────────────────────────────────────────────────────┐
│                    MODO OFFLINE                              │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │ Celular │───▶│ IndexedDB    │───▶│ Cola Local      │    │
│  │ (App)   │    │ (Datos)      │    │ (Pendientes)    │    │
│  └─────────┘    └──────────────┘    └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ (cuando hay internet)
┌─────────────────────────────────────────────────────────────┐
│                    MODO ONLINE                               │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────┐   │
│  │ Cola Local   │───▶│ API Server   │───▶│ SQLite DB   │   │
│  │ (Pendientes) │    │ (Sincroniza) │    │ (Servidor)  │   │
│  └──────────────┘    └──────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Características

| Funcionalidad | Online | Offline |
|---------------|--------|---------|
| Ver productos | ✅ Datos actualizados | ✅ Desde caché local |
| Realizar ventas | ✅ Sincronización inmediata | ✅ Se guarda localmente |
| Ver reportes | ✅ Datos completos | ✅ Datos en caché |
| Gestionar inventario | ✅ Sincronización inmediata | ⚠️ Pendiente hasta conectar |

### Indicador de Estado

La app muestra un indicador visual:
- 🟢 **Online** - Conexión activa, datos sincronizados
- 🟡 **Offline** - Sin conexión, datos guardados localmente
- 🔴 **Pendientes** - Hay datos esperando sincronización

---

## 👥 GESTIÓN DE USUARIOS

### Acceso a Configuración

1. Ingresar como **Administrador** (admin@kioskoia.com / admin123)
2. Ir a **Configuración** en el menú lateral
3. Sección **Gestión de Usuarios**

### Crear Nuevo Usuario

1. Clic en **"Nuevo Usuario"**
2. Completar formulario:
   - **Nombre:** Nombre completo
   - **Email:** Correo electrónico
   - **Contraseña:** Mínimo 6 caracteres
   - **Rol:** 
     - **Administrador:** Acceso completo, puede gestionar usuarios
     - **Tendero:** Puede vender y ver inventario, no puede gestionar usuarios
   - **Teléfono:** (opcional)
3. Clic en **"Crear Usuario"**

### Editar Usuario

1. En la tabla de usuarios, clic en el ícono de **lápiz** (editar)
2. Modificar los campos deseados
3. Para cambiar contraseña: dejar vacío para mantener la actual
4. Clic en **"Guardar Cambios"**

### Eliminar Usuario

1. Clic en el ícono de **papelera** (eliminar)
2. Confirmar la eliminación
3. **Nota:** No puedes eliminar tu propia cuenta

---

## 📊 ESTRUCTURA DEL PROYECTO

```
kioskoia/
├── prisma/
│   ├── schema.prisma    # Esquema de base de datos
│   └── seed.ts          # Datos de prueba
├── src/
│   ├── app/
│   │   ├── api/         # Endpoints REST
│   │   │   ├── auth/    # Autenticación
│   │   │   ├── users/   # Gestión de usuarios
│   │   │   ├── products/# Productos
│   │   │   ├── sales/   # Ventas
│   │   │   └── ...      # Más APIs
│   │   ├── productos/   # Gestión de productos
│   │   ├── ventas/      # Punto de venta
│   │   ├── inventario/  # Control de stock
│   │   ├── ia/          # Predicciones IA
│   │   └── configuracion/ # Configuración y usuarios
│   ├── components/      # Componentes UI
│   ├── lib/             # Utilidades
│   └── store/           # Estado global (Zustand)
└── public/
    ├── manifest.json    # Configuración PWA
    ├── sw.js            # Service Worker
    └── download/        # Archivos descargables
```

---

## 🌐 DESPLIEGUE EN PRODUCCIÓN

### Opción 1: Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

### Opción 2: Servidor propio (VPS)

```bash
# 1. Clonar y configurar
git clone [tu-repo]
cd kioskoia
bun install

# 2. Build de producción
bun run build

# 3. Iniciar con PM2
pm2 start bun --name "kioskoia" -- run start
```

---

## ❓ PREGUNTAS FRECUENTES

### ¿Puedo usar la app sin internet?
**Sí.** La app funciona offline. Los datos se sincronizan cuando recuperes conexión.

### ¿Cómo respaldo los datos?
La base de datos SQLite está en `db/custom.db`. Copia este archivo para respaldar.

### ¿Puedo tener múltiples tiendas?
La versión actual soporta una tienda. Para múltiples tiendas, necesitarías instancias separadas.

### ¿Es segura la conexión?
Para producción, usa HTTPS. En desarrollo local, HTTP es aceptable.

### Olvidé mi contraseña, ¿qué hago?
Un administrador puede cambiar tu contraseña desde Configuración → Gestión de Usuarios.

---

## 🛠️ SOPORTE

- **Documentación:** Incluida en el proyecto
- **Issues:** Reportar en el repositorio

---

**¡Gracias por usar KioskoIA! 🎉**
