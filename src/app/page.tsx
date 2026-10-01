import Link from "next/link";
import { JobCard } from "@/components/job-card";
import { getCurrentUser } from "@/lib/auth";
import { categoryIcon } from "@/lib/category-icons";
import { CATEGORIES } from "@/lib/constants";
import { getStats, listOpenJobs } from "@/lib/queries";

const STEPS = [
  { icon: "✍️", title: "Daftar", text: "Cukup nama & nomor HP. Gratis." },
  { icon: "🔍", title: "Pilih kerjaan", text: "Lihat upah, tanggal & tempatnya." },
  { icon: "🤝", title: "Lamar & kerja", text: "Diterima? Chat, datang, dibayar." },
];

export default async function Home() {
  const [jobs, stats, user] = await Promise.all([listOpenJobs({}, 6), getStats(), getCurrentUser()]);
  const postHref = user ? "/lowongan/baru" : "/daftar?peran=pemberi_kerja";

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 md:py-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            ☀️ Kerja harian, dibayar harian
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-6xl">
            Cari kerja hari ini,
            <br />
            <span className="text-amber-300">gajian hari ini.</span>
          </h1>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <Link href="/lowongan" className="btn-big bg-white text-brand-900 shadow-lg hover:bg-brand-50">
              <span className="text-3xl" aria-hidden="true">
                🔍
              </span>
              Saya Cari Kerja
            </Link>
            <Link href={postHref} className="btn-big bg-amber-400 text-slate-900 shadow-lg hover:bg-amber-300">
              <span className="text-3xl" aria-hidden="true">
                🧑‍🔧
              </span>
              Saya Cari Pekerja
            </Link>
          </div>

          <form action="/lowongan" className="mt-4 flex max-w-2xl gap-2 rounded-2xl bg-white p-2 shadow-lg">
            <input
              name="q"
              placeholder="Mau kerja apa? mis. kuli, cat, masak"
              aria-label="Cari kerjaan"
              className="min-w-0 flex-1 rounded-xl px-3 py-3 text-base text-slate-900 outline-none"
            />
            <button className="btn-primary" aria-label="Cari">
              🔍 <span className="hidden sm:inline">Cari</span>
            </button>
          </form>

          <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-brand-50">
            <div>
              <dt className="sr-only">Kerjaan tersedia</dt>
              <dd>
                <strong className="text-2xl text-white">{stats.openJobs}</strong> kerjaan tersedia
              </dd>
            </div>
            <div>
              <dt className="sr-only">Pekerja</dt>
              <dd>
                <strong className="text-2xl text-white">{stats.workers}</strong> pekerja
              </dd>
            </div>
            <div>
              <dt className="sr-only">Pemberi kerja</dt>
              <dd>
                <strong className="text-2xl text-white">{stats.employers}</strong> pemberi kerja
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-extrabold">Pilih jenis kerjaan</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/lowongan?kategori=${encodeURIComponent(c)}`}
              className="card flex flex-col items-center gap-1.5 p-3 text-center transition hover:border-brand-500 hover:shadow-md active:scale-95"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-4xl" aria-hidden="true">
                {categoryIcon(c)}
              </span>
              <span className="text-sm font-semibold leading-tight text-slate-700">{c}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Kerjaan terbaru</h2>
          <Link href="/lowongan" className="font-bold text-brand-700 hover:underline">
            Lihat semua →
          </Link>
        </div>
        {jobs.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="card mt-4 p-8 text-center text-slate-500">
            <div className="text-4xl">🕊️</div>
            <p className="mt-2">Belum ada kerjaan. Coba lagi nanti ya.</p>
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-extrabold">Cara pakainya gampang</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-center gap-4 rounded-2xl bg-brand-50 p-4">
                <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-3xl shadow-sm">
                  {s.icon}
                  <span className="absolute -left-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <span>
                  <span className="block text-lg font-bold">{s.title}</span>
                  <span className="text-slate-600">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          {!user && (
            <Link href="/daftar" className="btn-big btn-primary mt-6 sm:w-auto">
              ✍️ Daftar Gratis Sekarang
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
