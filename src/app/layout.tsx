import type { Metadata, Viewport } from "next";
import { Archivo, Bodoni_Moda, Inter } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], axes: ["opsz"] });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Trumee — Effortless Western Wear for the Free-Spirited", template: "%s | Trumee" },
  description:
    "Boho dresses, crochet tops, schiffli jumpsuits and co-ord sets made for getaways and everyday magic. Shop Trumee — easygoing, feel-good fashion, delivered across India.",
  openGraph: { type: "website", siteName: "Trumee", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#22101e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${bodoni.variable} ${archivo.variable} ${inter.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
