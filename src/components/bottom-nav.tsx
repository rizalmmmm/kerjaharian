"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; icon: string; label: string; badge?: number; primary?: boolean };

/** Menu bawah ala aplikasi (khusus layar HP): ikon besar + tulisan singkat. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      aria-label="Menu utama"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => (
          <li key={it.href} className="flex-1">
            <Link
              href={it.href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-xs font-semibold ${
                active(it.href) ? "text-brand-700" : "text-slate-500"
              }`}
            >
              <span
                className={`grid h-9 w-12 place-items-center rounded-full text-2xl leading-none transition ${
                  it.primary ? "bg-brand-600 shadow-md" : active(it.href) ? "bg-brand-100" : ""
                }`}
                aria-hidden="true"
              >
                {it.icon}
              </span>
              {it.label}
              {!!it.badge && (
                <span className="absolute right-[22%] top-1 min-w-5 rounded-full bg-red-500 px-1 text-[11px] leading-5 text-white">
                  {it.badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
