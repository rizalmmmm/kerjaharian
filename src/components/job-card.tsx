import Link from "next/link";
import { categoryIcon } from "@/lib/category-icons";
import { WAGE_UNITS, formatRupiah } from "@/lib/constants";
import type { Job } from "@/lib/queries";

/** Tanggal singkat & mudah dibaca: "Hari ini", "Besok", atau "Sab, 4 Okt". */
const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

function tanggalSingkat(iso: string) {
  const today = todayWib();
  const tomorrow = new Date(Date.now() + 31 * 3600 * 1000).toISOString().slice(0, 10);
  if (iso === today) return "Hari ini";
  if (iso === tomorrow) return "Besok";
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

export function JobCard({ job }: { job: Job }) {
  const remaining = Math.max(job.slots - job.accepted_count, 0);
  const when = tanggalSingkat(job.work_date);
  const past = job.work_date < todayWib();
  return (
    <Link
      href={`/lowongan/${job.id}`}
      className={`card group flex gap-4 p-4 transition hover:shadow-md active:scale-[.99] ${
        past ? "bg-slate-50 opacity-80 hover:border-slate-400" : "hover:border-brand-500"
      }`}
    >
      <span
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${past ? "bg-slate-200 grayscale" : "bg-brand-50"}`}
        aria-hidden="true"
      >
        {categoryIcon(job.category)}
      </span>
      <div className="min-w-0 flex-1">
        {past && (
          <span className="mb-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
            ⏰ Sudah lewat
          </span>
        )}
        <h3 className="text-lg font-bold leading-snug text-slate-900 group-hover:text-brand-700">{job.title}</h3>
        <p className="truncate text-sm text-slate-500">{job.employer_name}</p>
        <p className={`mt-1 text-xl font-extrabold ${past ? "text-slate-500" : "text-brand-700"}`}>
          {formatRupiah(job.wage)}
          <span className="text-sm font-semibold text-slate-500"> {WAGE_UNITS[job.wage_unit]}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[13px] sm:text-sm">
          <span className="rounded-full bg-slate-100 px-2 py-0.5">📍 {job.city}</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              when === "Hari ini" ? "bg-amber-100 font-semibold text-amber-800" : "bg-slate-100"
            }`}
          >
            📅 {when}
            {job.start_time && ` · ${job.start_time}`}
          </span>
          {!past && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5">
              👥 {remaining > 0 ? `Butuh ${remaining} orang` : "Sudah penuh"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
