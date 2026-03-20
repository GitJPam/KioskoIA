# 📱 KioskoIA - Guía de Instalación y Uso

## 📦 Descargar el Proyecto

El proyecto está disponible en: **`/home/z/kioskoia-proyecto.zip`** (1.1 MB)

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
bun run db:generate

# Crear base de datos
bun run db:push

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

KioskoIA implementa un sistema de **sincronización offline-first** que permite:

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

### Proceso de Sincronización Automática

1. **Detecta conexión:** La app monitorea el estado de red
2. **Cola de pendientes:** Las operaciones offline se encolan
3. **Sincronización:** Al recuperar conexión:
   - Envía datos pendientes al servidor
   - Descarga actualizaciones
   - Notifica al usuario

### Configuración del Servidor para Múltiples Dispositivos

Para sincronizar entre PC y celulares, necesitas:

```bash
# 1. Configurar HOST en .env
HOST=0.0.0.0
PORT=3000

# 2. Iniciar el servidor
bun run dev
```

**Estructura de red recomendada:**
```
┌─────────────────────────────────────────────┐
│              ROUTER WIFI                    │
│         192.168.1.1                         │
└─────────────────────────────────────────────┘
        │           │           │
        ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │   PC    │ │ Celular │ │ Tablet  │
   │ Servidor│ │ Cliente │ │ Cliente │
   │.1.100   │ │ .1.101  │ │ .1.102  │
   └─────────┘ └─────────┘ └─────────┘
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

### Opción 3: Docker

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

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
│   │   ├── productos/   # Gestión de productos
│   │   ├── ventas/      # Punto de venta
│   │   ├── inventario/  # Control de stock
│   │   └── ia/          # Predicciones IA
│   ├── components/      # Componentes UI
│   ├── lib/             # Utilidades
│   └── store/           # Estado global (Zustand)
└── public/
    └── manifest.json    # Configuración PWA
```

---

## ❓ PREGUNTAS FRECUENTES

### ¿Puedo usar la app sin internet?
**Sí.** La app funciona offline. Los datos se sincronizan cuando recuperes conexión.

### ¿Cómo respaldo los datos?
La base de datos SQLite está en `db/custom.db`. Copia este archivo para respaldar.

### ¿Puedo tener múltiples tiendas?
La versión actual soporta una tienda. Para múltiples tiendas, necesitarías instancias separadas o una actualización al schema.

### ¿Es segura la conexión?
Para producción, usa HTTPS. En desarrollo local, HTTP es aceptable.

### ¿Funciona en cualquier navegador?
Recomendamos Chrome, Firefox, Safari o Edge actualizados.

---

## 🛠️ SOPORTE

- **Documentación:** Incluida en el proyecto
- **Issues:** Reportar en el repositorio
- **Email:** soporte@kioskoia.com

---

**¡Gracias por usar KioskoIA! 🎉**
