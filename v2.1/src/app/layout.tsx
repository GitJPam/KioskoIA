import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KioskoIA",
  description: "Sistema de gestión de tiendas escolares",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
