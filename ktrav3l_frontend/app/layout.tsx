import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KTravel - Reserva tu Cita",
  description: "Reserva tu cita facilmente.",
  metadataBase: new URL("https://ktrav3l.com"),
  openGraph: {
    title: "KTravel - Reserva tu Cita",
    description: "Reserva tu cita facilmente.",
    url: "https://ktrav3l.com",
    siteName: "KTravel",
    images: [
      {
        url: "https://ktrav3l.com/front_page.jpg",
        width: 1200,
        height: 630,
        alt: "KTravel",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KTravel - Reserva tu Cita",
    description: "Reserva tu cita facilmente.",
    images: ["https://ktrav3l.com/front_page.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="top-right" richColors />
        {children}
      </body>
    </html>
  );
}
