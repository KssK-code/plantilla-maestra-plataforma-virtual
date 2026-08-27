import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ESCUELA_CONFIG } from "@/lib/config";
import { Providers } from "@/components/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const description = "Estudia Secundaria o Preparatoria desde casa. Acompañamiento en la gestión de tu certificación con validez oficial. 100% en línea, a tu ritmo, sin examen final."

export const viewport: Viewport = {
  // Configurable por cliente en lib/config.ts (colores.themeColor). Estaba
  // hardcodeado a un gris casi negro heredado de un cliente con tema oscuro,
  // que no corresponde al fondo claro de la plantilla.
  themeColor: ESCUELA_CONFIG.colores.themeColor,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: `${ESCUELA_CONFIG.nombre} | ${ESCUELA_CONFIG.tagline}`,
    template: `%s | ${ESCUELA_CONFIG.nombre}`,
  },
  description,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: ESCUELA_CONFIG.nombre,
    description,
    type: "website",
    locale: "es_MX",
    siteName: ESCUELA_CONFIG.nombre,
  },
  twitter: {
    card: "summary",
    title: ESCUELA_CONFIG.nombre,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Bug 31 fix: inyectar CSS vars desde CONFIG.colores para que páginas auth +
  // dashboard alumno + admin lean var(--color-*) en lugar de hex hardcoded.
  // Cliente solo configura src/lib/config.ts y la plataforma toma su paleta.
  const c = ESCUELA_CONFIG.colores as typeof ESCUELA_CONFIG.colores & Partial<Record<
    'sidebarActivo' | 'sidebarActivoTexto' | 'sidebarHover' | 'sidebarRealce'
    | 'sidebarBorde' | 'sidebarBordeFuerte', string>>

  const cssVars = {
    '--color-primario':           ESCUELA_CONFIG.colores.primario,
    '--color-acento':             ESCUELA_CONFIG.colores.acento,
    '--color-acento-hover':       ESCUELA_CONFIG.colores.acentoHover,
    '--color-texto-sobre-acento': ESCUELA_CONFIG.colores.textoSobreAcento,
    '--color-texto':              ESCUELA_CONFIG.colores.texto,
    '--color-texto-secundario':   ESCUELA_CONFIG.colores.textoSecundario,
    '--color-fondo':              ESCUELA_CONFIG.colores.fondo,
    '--color-superficie':         ESCUELA_CONFIG.colores.superficie,
    '--color-borde':              ESCUELA_CONFIG.colores.borde,
    // Realces del sidebar. OPCIONALES: si el cliente no los declara quedan
    // undefined y sidebar.tsx cae en su fallback histórico, así que un cliente
    // que no los use ve exactamente el mismo panel de siempre. Existen porque
    // van ENCIMA de `primario`, y con dos colores de marca vecinos en el
    // círculo cromático el item activo dejaba de distinguirse del fondo.
    '--color-sidebar-activo':        c.sidebarActivo,
    '--color-sidebar-activo-texto':  c.sidebarActivoTexto,
    '--color-sidebar-hover':         c.sidebarHover,
    '--color-sidebar-realce':        c.sidebarRealce,
    '--color-sidebar-borde':         c.sidebarBorde,
    '--color-sidebar-borde-fuerte':  c.sidebarBordeFuerte,
  } as React.CSSProperties

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={cssVars}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
