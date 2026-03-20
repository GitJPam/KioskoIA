import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#059669",
};

export const metadata: Metadata = {
  title: {
    default: "KioskoIA - Sistema de Gestión de Tiendas Escolares",
    template: "%s | KioskoIA",
  },
  description: "Sistema inteligente para gestión de kioskos y tiendas escolares. Punto de venta, inventario y predicciones con IA.",
  keywords: ["kiosko", "tienda escolar", "POS", "punto de venta", "inventario", "Colombia"],
  authors: [{ name: "KioskoIA Team" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KioskoIA",
  },
  formatDetection: {
    telephone: true,
  },
  openGraph: {
    type: "website",
    siteName: "KioskoIA",
    title: "KioskoIA - Sistema de Gestión de Tiendas Escolares",
    description: "Sistema inteligente para gestión de kioskos y tiendas escolares",
  },
  twitter: {
    card: "summary",
    title: "KioskoIA",
    description: "Sistema inteligente para gestión de kioskos y tiendas escolares",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-right" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('SW registrado:', registration.scope);
                    },
                    function(err) {
                      console.log('SW falló:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
