import type { Metadata } from "next";
import { JobCard } from "@/components/job-card";
import { CATEGORIES } from "@/lib/constants";
import { listCities, listOpenJobs } from "@/lib/queries";

export const metadata: Metadata = { title: "Cari Lowongan Kerja Harian" };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function JobsPage(props: PageProps<"/lowongan">) {
  const sp = await props.searchParams;
  const q = one(sp.q);
  const category = one(sp.kategori);
  const city = one(sp.kota);
  const [jobs, cities] = await Promise.all([listOpenJobs({ q, category, city }), listCities()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Lowongan kerja harian</h1>
      <form className="card mt-4 grid gap-3 p-4 sm:grid-cols-[1fr_200px_180px_auto]">
        <input name="q" defaultValue={q} placeholder="Kata kunci" className="input" />
        <select name="kategori" defaultValue={category} className="input">
          <option value="">Semua kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input name="kota" defaultValue={city} placeholder="Kota" list="kota-list" className="input" />
        <datalist id="kota-list">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button className="btn-primary">Cari</button>
      </form>

      <p className="mt-6 text-sm text-slate-500">{jobs.length} lowongan ditemukan</p>
      {jobs.length ? (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="card mt-3 p-10 text-center text-slate-500">
          Tidak ada lowongan yang cocok. Coba ubah kata kunci atau kota.
        </div>
      )}
    </div>
  );
}
