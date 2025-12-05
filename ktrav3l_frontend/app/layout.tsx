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
  openGraph: {
    title: "KTravel - Reserva tu Cita",
    description: "Reserva tu cita facilmente.",
    images: [
      {
        url: "/front_page.jpg",
        width: 1200,
        height: 630,
        alt: "KTravel",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KTravel - Reserva tu Cita",
    description: "Reserva tu cita facilmente.",
    images: ["/front_page.jpg"],
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
