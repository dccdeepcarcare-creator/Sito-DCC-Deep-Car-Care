import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { localBusinessJsonLd } from "@/lib/schema";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: "%s | DCC Deep Car Care",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "detailing interni Ravenna",
    "pulizia interni auto Ravenna",
    "car detailing Ravenna",
    "sanificazione auto Ravenna",
    "lavaggio sedili auto",
    "Deep Car Care",
  ],
  authors: [{ name: site.name }],
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.title,
    description: site.description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: site.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    images: ["/og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: "#090A0F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = JSON.stringify(localBusinessJsonLd()).replace(/</g, "\\u003c");

  return (
    <html lang="it" className={archivo.variable}>
      <body className="bg-carbon font-sans text-testo antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-oro focus:px-4 focus:py-2 focus:text-carbon"
        >
          Vai ai contenuti
        </a>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </body>
    </html>
  );
}