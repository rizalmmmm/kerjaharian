import Link from "next/link";
import { JobCard } from "@/components/job-card";
import { CATEGORIES } from "@/lib/constants";
import { getStats, listOpenJobs } from "@/lib/queries";

export default function Home() {
  const jobs = listOpenJobs({}, 6);
  const stats = getStats();

  return (
    <>
      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
              Kerja hari ini,
              <br />
              dibayar hari ini.
            </h1>
            <p className="mt-4 max-w-md text-lg text-brand-100">
              Temukan pekerjaan harian di sekitar Anda, atau dapatkan pekerja andal untuk kebutuhan mendadak — cepat,
              mudah, dan gratis.
            </p>
            <form action="/lowongan" className="mt-8 flex max-w-lg flex-col gap-2 rounded-xl bg-white p-2 sm:flex-row">
              <input
                name="q"
                placeholder="Cari pekerjaan, mis. bongkar muat"
                className="flex-1 rounded-lg px-3 py-2 text-slate-900 outline-none"
              />
              <input
                name="kota"
                placeholder="Kota"
                className="rounded-lg px-3 py-2 text-slate-900 outline-none sm:w-32 sm:border-l sm:border-slate-200"
              />
              <button className="btn-primary">Cari</button>
            </form>
          </div>
          <div className="grid grid-cols-3 gap-3 self-end">
            {[
              [stats.openJobs, "Lowongan aktif"],
              [stats.workers, "Pekerja"],
              [stats.employers, "Pemberi kerja"],
            ].map(([n, label]) => (
              <div key={label} className="rounded-xl bg-white/10 p-4 text-center">
                <div className="text-3xl font-extrabold">{n}</div>
                <div className="text-sm text-brand-100">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold">Kategori populer</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/lowongan?kategori=${encodeURIComponent(c)}`}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:border-brand-600 hover:text-brand-700"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">Lowongan terbaru</h2>
          <Link href="/lowongan" className="text-sm font-semibold text-brand-700 hover:underline">
            Lihat semua →
          </Link>
        </div>
        {jobs.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-500">Belum ada lowongan aktif.</p>
        )}
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold">Untuk pekerja</h2>
            <ol className="mt-4 space-y-3 text-slate-600">
              <li>1. Daftar gratis sebagai pekerja.</li>
              <li>2. Cari lowongan harian di kota Anda.</li>
              <li>3. Lamar dengan satu klik, tunggu konfirmasi.</li>
              <li>4. Datang, bekerja, dan terima upah.</li>
            </ol>
            <Link href="/daftar?peran=pekerja" className="btn-primary mt-6">
              Daftar sebagai pekerja
            </Link>
          </div>
          <div>
            <h2 className="text-xl font-bold">Untuk pemberi kerja</h2>
            <ol className="mt-4 space-y-3 text-slate-600">
              <li>1. Daftar sebagai pemberi kerja.</li>
              <li>2. Pasang lowongan: tanggal, jam, upah, jumlah orang.</li>
              <li>3. Pilih pelamar yang cocok.</li>
              <li>4. Hubungi langsung via WhatsApp.</li>
            </ol>
            <Link href="/daftar?peran=pemberi_kerja" className="btn-outline mt-6">
              Pasang lowongan gratis
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
