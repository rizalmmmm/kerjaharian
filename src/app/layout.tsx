import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/header";
import { LogoMark } from "@/components/logo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.kerja-harian.id"),
  applicationName: "Kerja Harian",
  title: {
    default: "Kerja Harian — Cari Pekerja & Pekerjaan Harian",
    template: "%s | Kerja Harian",
  },
  description:
    "kerja-harian.id mempertemukan pemberi kerja dengan pekerja harian lepas di seluruh Indonesia. Pasang lowongan gratis, lamar dalam hitungan detik.",
};

export const viewport: Viewport = { themeColor: "#047857" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-20 font-sans sm:pb-0">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between">
            <p className="flex items-center gap-2">
              <LogoMark className="h-5 w-5" />© {new Date().getFullYear()} kerja-harian.id
            </p>
            <p>Pekerjaan harian, dibayar harian.</p>
          </div>
        </footer>
        {/* Statistik pengunjung Vercel Web Analytics (aktifkan di dashboard: tab Analytics). */}
        <Analytics />
      </body>
    </html>
  );
}
