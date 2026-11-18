import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "GuseoCare - SIMRS Universitas Guseo",
    template: "%s | GuseoCare",
  },
  description:
    "Sistem Informasi Manajemen Rumah Sakit Pendidikan Universitas Guseo untuk layanan janji temu, rekam medis, dan farmasi terpadu.",
  icons: {
    icon: "/guseocare-logo.ico",
    shortcut: "/guseocare-logo.ico",
    apple: "/guseocare-logo.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}