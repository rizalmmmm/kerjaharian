import Link from "next/link";
import { WAGE_UNITS, formatRupiah, formatTanggal } from "@/lib/constants";
import type { Job } from "@/lib/queries";

export function JobCard({ job }: { job: Job }) {
  const remaining = Math.max(job.slots - job.accepted_count, 0);
  return (
    <Link
      href={`/lowongan/${job.id}`}
      className="card group flex flex-col gap-3 p-5 transition hover:border-brand-500 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {job.category}
          </span>
          <h3 className="mt-2 font-bold text-slate-900 group-hover:text-brand-700">{job.title}</h3>
          <p className="text-sm text-slate-500">{job.employer_name}</p>
        </div>
      </div>
      <div className="text-lg font-extrabold text-brand-700">
        {formatRupiah(job.wage)}
        <span className="text-sm font-medium text-slate-500"> {WAGE_UNITS[job.wage_unit]}</span>
      </div>
      <dl className="grid gap-1 text-sm text-slate-600">
        <div>📍 {job.city}</div>
        <div>
          📅 {formatTanggal(job.work_date)}
          {job.start_time && ` · ${job.start_time}–${job.end_time}`}
        </div>
        <div>👥 {remaining > 0 ? `Butuh ${remaining} dari ${job.slots} orang` : "Kuota terpenuhi"}</div>
      </dl>
    </Link>
  );
}
