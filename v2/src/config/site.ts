// ============================================
// KIOSKOIA - Configuración del Sitio
// ============================================

export const siteConfig = {
  name: 'KioskoIA',
  description: 'Sistema Inteligente de Gestión de Tiendas Escolares',
  tagline: 'Tu tienda escolar inteligente',
  url: 'https://kioskoia.com',
  ogImage: '/og-image.png',
  links: {
    twitter: 'https://twitter.com/kioskoia',
    github: 'https://github.com/kioskoia',
  },
  creator: 'KioskoIA Team',
  version: '2.0.0',
};

export const navigationConfig = {
  mainNav: [
    {
      title: 'Dashboard',
      href: '/',
      icon: 'LayoutDashboard',
    },
    {
      title: 'Ventas',
      href: '/ventas',
      icon: 'ShoppingCart',
    },
    {
      title: 'Inventario',
      href: '/inventario',
      icon: 'Package',
    },
    {
      title: 'Productos',
      href: '/productos',
      icon: 'Box',
    },
    {
      title: 'Reportes',
      href: '/reportes',
      icon: 'BarChart3',
    },
    {
      title: 'Proveedores',
      href: '/proveedores',
      icon: 'Truck',
    },
  ],
  adminNav: [
    {
      title: 'Usuarios',
      href: '/usuarios',
      icon: 'Users',
    },
    {
      title: 'Configuración',
      href: '/configuracion',
      icon: 'Settings',
    },
    {
      title: 'IA Insights',
      href: '/ia',
      icon: 'Brain',
    },
  ],
};
