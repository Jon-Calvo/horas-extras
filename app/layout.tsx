import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { obtenerConfiguracionApariencia } from "@/lib/theme/obtener-configuracion-apariencia";
import { resolverTemaUsuario } from "@/lib/theme/resolver-tema";
import { ThemeStyleTag } from "@/lib/theme/theme-style-tag";
import { NoFlashThemeScript } from "@/lib/theme/no-flash-script";
import { ThemeProvider } from "@/lib/theme/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Horas Extras",
  description: "Sistema de gestión de horas extras",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await obtenerConfiguracionApariencia();

  const { preferencia } = await resolverTemaUsuario(
    config.temaPredeterminado
  );

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeStyleTag config={config} />

        <NoFlashThemeScript
          temaPredeterminadoEmpresa={config.temaPredeterminado}
        />
      </head>

      <body className="min-h-full flex flex-col">
        <ThemeProvider preferenciaInicial={preferencia}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}