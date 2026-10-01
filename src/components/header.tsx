import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { unreadCounts } from "@/lib/deal";
import { BottomNav, type NavItem } from "./bottom-nav";
import { Logo } from "./logo";

const navLink = "rounded-xl px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100";

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? [...(await unreadCounts(user.id)).values()].reduce((a, b) => a + b, 0) : 0;

  const mobileItems: NavItem[] = user
    ? [
        { href: "/", icon: "🏠", label: "Beranda" },
        { href: "/lowongan", icon: "🔍", label: "Cari Kerja" },
        ...(user.role === "pemberi_kerja"
          ? [{ href: "/lowongan/baru", icon: "➕", label: "Pasang", primary: true }]
          : []),
        { href: "/dasbor", icon: "📋", label: "Kerjaanku", badge: unread },
        { href: `/profil/${user.id}`, icon: "👤", label: "Profil" },
      ]
    : [
        { href: "/", icon: "🏠", label: "Beranda" },
        { href: "/lowongan", icon: "🔍", label: "Cari Kerja" },
        { href: "/daftar", icon: "✍️", label: "Daftar", primary: true },
        { href: "/masuk", icon: "🔑", label: "Masuk" },
      ];

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="shrink-0 whitespace-nowrap" aria-label="kerja-harian.id — beranda">
            <Logo />
          </Link>
          {/* Menu atas hanya di layar lebar; di HP memakai menu bawah. */}
          <nav className="hidden items-center gap-2 whitespace-nowrap sm:flex">
            <Link href="/lowongan" className={navLink}>
              🔍 Cari Kerja
            </Link>
            {user ? (
              <>
                {user.role === "pemberi_kerja" && (
                  <Link href="/lowongan/baru" className="btn-primary">
                    ➕ Pasang Kerjaan
                  </Link>
                )}
                <Link href="/dasbor" className={navLink}>
                  📋 Kerjaanku
                  {unread > 0 && (
                    <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white" title="Pesan belum dibaca">
                      {unread}
                    </span>
                  )}
                </Link>
                <form action={logout}>
                  <button className={`${navLink} text-slate-500`}>Keluar</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/masuk" className={navLink}>
                  Masuk
                </Link>
                <Link href="/daftar" className="btn-primary">
                  Daftar Gratis
                </Link>
              </>
            )}
          </nav>
          {user ? (
            <form action={logout} className="sm:hidden">
              <button className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500">Keluar</button>
            </form>
          ) : (
            <Link href="/masuk" className="btn-outline sm:hidden">
              Masuk
            </Link>
          )}
        </div>
      </header>
      <BottomNav items={mobileItems} />
    </>
  );
}
