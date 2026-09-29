import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kerja Harian — Cari Pekerja & Pekerjaan Harian",
    template: "%s | Kerja Harian",
  },
  description:
    "kerja-harian.id mempertemukan pemberi kerja dengan pekerja harian lepas di seluruh Indonesia. Pasang lowongan gratis, lamar dalam hitungan detik.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} kerja-harian.id</p>
            <p>Pekerjaan harian, dibayar harian.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
