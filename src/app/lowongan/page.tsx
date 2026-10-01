import type { Metadata } from "next";
import { JobCard } from "@/components/job-card";
import Link from "next/link";
import { categoryIcon } from "@/lib/category-icons";
import { CATEGORIES } from "@/lib/constants";
import { listCities, listOpenJobs, listPastJobs } from "@/lib/queries";

export const metadata: Metadata = { title: "Cari Kerja Harian" };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function JobsPage(props: PageProps<"/lowongan">) {
  const sp = await props.searchParams;
  const q = one(sp.q);
  const category = one(sp.kategori);
  const city = one(sp.kota);
  const [jobs, pastJobs, cities] = await Promise.all([
    listOpenJobs({ q, category, city }),
    listPastJobs({ q, category, city }),
    listCities(),
  ]);

  const link = (params: Record<string, string>) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    return `/lowongan${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-3xl font-extrabold">Cari Kerja 🔍</h1>
      <form className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
        <input type="hidden" name="kategori" value={category} />
        <input name="q" defaultValue={q} placeholder="Mau kerja apa?" aria-label="Kata kunci" className="input" />
        <input
          name="kota"
          defaultValue={city}
          placeholder="📍 Desa / Kota"
          aria-label="Kota"
          list="kota-list"
          className="input"
        />
        <datalist id="kota-list">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button className="btn-primary">🔍 Cari</button>
      </form>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2" role="list" aria-label="Jenis kerjaan">
        {["", ...CATEGORIES].map((c) => {
          const active = c === category;
          return (
            <Link
              key={c || "semua"}
              role="listitem"
              href={link({ q, kota: city, kategori: c })}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2 font-semibold transition ${
                active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <span aria-hidden="true">{c ? categoryIcon(c) : "✨"}</span>
              {c || "Semua"}
            </Link>
          );
        })}
      </div>

      <p className="mt-3 text-slate-600">
        <strong>{jobs.length}</strong> kerjaan ditemukan
      </p>
      {jobs.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="card mt-3 p-10 text-center text-slate-600">
          <div className="text-5xl">🤔</div>
          <p className="mt-3 text-lg">Belum ada kerjaan yang cocok.</p>
          <Link href="/lowongan" className="btn-outline mt-4">
            Lihat semua kerjaan
          </Link>
        </div>
      )}

      {pastJobs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-slate-700">⏰ Kerjaan yang sudah lewat</h2>
          <p className="text-slate-500">
            Sudah tidak bisa dilamar — sebagai gambaran upah & jenis kerjaan di daerah Anda.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
