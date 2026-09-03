import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import Providers from "./providers";
import { BootstrapGate } from "@/components/BootstrapGate";
import { PwaManager } from "@/components/pwa/PwaManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Transit",
  title: "Transit — live bus tracking",
  description: "Real-time public transport tracking for small cities",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Transit",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#111318",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <NextIntlClientProvider>
          <Providers>
            <BootstrapGate>{children}</BootstrapGate>
            <PwaManager />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
