import type { Metadata } from "next";
import Link from "next/link";
import { Field } from "@/components/field";
import { ActionForm } from "@/components/forms";
import { StatusBadge } from "@/components/status-badge";
import { requireUser, type User } from "@/lib/auth";
import { updateProfile } from "@/lib/actions";
import { WAGE_UNITS, formatRupiah, formatTanggal } from "@/lib/constants";
import { listApplicationsByWorker, listJobsByEmployer } from "@/lib/queries";

export const metadata: Metadata = { title: "Dasbor" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-2xl font-extrabold">Halo, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-slate-600">{user.role === "pekerja" ? "Akun pekerja" : "Akun pemberi kerja"}</p>
        <div className="mt-6">{user.role === "pekerja" ? <WorkerView user={user} /> : <EmployerView user={user} />}</div>
      </div>
      <aside className="card h-fit p-5">
        <h2 className="font-bold">Profil</h2>
        <ActionForm action={updateProfile} submitLabel="Simpan profil" pendingLabel="Menyimpan…" className="mt-3 grid gap-3">
          <Field label="Nama" name="name" defaultValue={user.name} required />
          <Field label="Nomor HP / WhatsApp" name="phone" defaultValue={user.phone} required />
          <Field label="Kota" name="city" defaultValue={user.city} />
          <div>
            <label htmlFor="bio" className="label">
              {user.role === "pekerja" ? "Pengalaman & keahlian" : "Tentang usaha"}
            </label>
            <textarea id="bio" name="bio" rows={3} maxLength={500} defaultValue={user.bio} className="input" />
          </div>
        </ActionForm>
        <p className="mt-3 text-xs text-slate-500">{user.email}</p>
      </aside>
    </div>
  );
}

function WorkerView({ user }: { user: User }) {
  const apps = listApplicationsByWorker(user.id);
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Lamaran saya</h2>
        <Link href="/lowongan" className="btn-primary">
          Cari kerja
        </Link>
      </div>
      {apps.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-slate-500">Anda belum melamar pekerjaan apa pun.</div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {apps.map((a) => (
            <li key={a.id} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/lowongan/${a.job_id}`} className="font-semibold hover:text-brand-700">
                  {a.title}
                </Link>
                <div className="text-sm text-slate-500">
                  {a.employer_name} · {a.city} · {formatTanggal(a.work_date)}
                </div>
                <div className="text-sm font-semibold text-brand-700">
                  {formatRupiah(a.wage)} {WAGE_UNITS[a.wage_unit]}
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <StatusBadge status={a.status} />
                {a.status === "diterima" && <span className="text-sm text-slate-600">Hubungi: {a.employer_phone}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmployerView({ user }: { user: User }) {
  const jobs = listJobsByEmployer(user.id);
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Lowongan saya</h2>
        <Link href="/lowongan/baru" className="btn-primary">
          + Pasang lowongan
        </Link>
      </div>
      {jobs.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-slate-500">Belum ada lowongan. Pasang yang pertama!</div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link
                href={`/lowongan/${j.id}`}
                className="card flex flex-col gap-2 p-4 hover:border-brand-500 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-semibold">{j.title}</div>
                  <div className="text-sm text-slate-500">
                    {j.city} · {formatTanggal(j.work_date)} · {j.status === "buka" ? "Dibuka" : "Ditutup"}
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  <strong>{j.applicant_count}</strong> pelamar · <strong>{j.accepted_count}</strong>/{j.slots} diterima
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
