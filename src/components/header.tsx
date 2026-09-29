import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { unreadCounts } from "@/lib/deal";

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? [...unreadCounts(user.id).values()].reduce((a, b) => a + b, 0) : 0;
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-extrabold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">KH</span>
          <span className="hidden sm:inline">
            kerja-harian<span className="text-slate-400">.id</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 whitespace-nowrap text-sm sm:gap-3">
          <Link href="/lowongan" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">
            Cari Kerja
          </Link>
          {user ? (
            <>
              {user.role === "pemberi_kerja" && (
                <span className="hidden sm:inline">
                  <Link href="/lowongan/baru" className="btn-primary">
                    + Pasang Lowongan
                  </Link>
                </span>
              )}
              <Link href="/dasbor" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">
                Dasbor
                {unread > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-1.5 text-xs text-white" title="Pesan belum dibaca">
                    {unread}
                  </span>
                )}
              </Link>
              <form action={logout}>
                <button className="rounded-lg px-3 py-2 font-medium text-slate-500 hover:bg-slate-100">Keluar</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/masuk" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">
                Masuk
              </Link>
              <Link href="/daftar" className="btn-primary">
                Daftar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
