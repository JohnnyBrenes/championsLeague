import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { TimezoneProvider } from "@/lib/timezone";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Champions 2026/27 — Calendario y Eliminatorias",
  description:
    "Calendario completo, fase liga y eliminatorias de la Champions League 2026/27. Schedule, league phase table and knockout bracket. Sitio no oficial, sin afiliación con la UEFA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Champions 26/27",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#060b26",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider>
          <TimezoneProvider>
            <Header />
            <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-6">
              {children}
            </main>
            <Footer />
          </TimezoneProvider>
        </I18nProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
