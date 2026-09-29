import type { Metadata } from "next";
import Link from "next/link";
import { Field } from "@/components/field";
import { ActionForm } from "@/components/forms";
import { StatusBadge } from "@/components/status-badge";
import { requireUser, type User } from "@/lib/auth";
import { resendVerification, updateProfile } from "@/lib/actions";
import { VerifiedBadge } from "@/components/verified-badge";
import { emailEnabled } from "@/lib/email";
import { WAGE_UNITS, formatRupiah, formatTanggal } from "@/lib/constants";
import { listApplicationsByWorker, listDealsForEmployer, listJobsByEmployer } from "@/lib/queries";
import { unreadCounts } from "@/lib/deal";

export const metadata: Metadata = { title: "Dasbor" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-2xl font-extrabold">Halo, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-slate-600">{user.role === "pekerja" ? "Akun pekerja" : "Akun pemberi kerja"}</p>
        {!user.email_verified_at && emailEnabled() && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">Verifikasi email Anda</p>
            <p className="mt-1 text-sm text-amber-800">
              Kami sudah mengirim tautan verifikasi ke <strong>{user.email}</strong>. Akun terverifikasi mendapat lencana{" "}
              <VerifiedBadge label="Terverifikasi" /> sehingga lebih dipercaya.
            </p>
            <ActionForm
              action={resendVerification}
              submitLabel="Kirim ulang email verifikasi"
              pendingLabel="Mengirim…"
              className="mt-3 grid max-w-sm gap-2"
            >
              {null}
            </ActionForm>
          </div>
        )}
        <div className="mt-6">
          {user.role === "pekerja" ? <WorkerView user={user} /> : <EmployerView user={user} />}
        </div>
      </div>
      <aside className="card h-fit p-5">
        <h2 className="font-bold">Profil</h2>
        <ActionForm
          action={updateProfile}
          submitLabel="Simpan profil"
          pendingLabel="Menyimpan…"
          className="mt-3 grid gap-3"
        >
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
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {user.email}
          {user.email_verified_at && <VerifiedBadge label="Terverifikasi" />}
        </p>
      </aside>
    </div>
  );
}

async function WorkerView({ user }: { user: User }) {
  const [apps, unread] = await Promise.all([listApplicationsByWorker(user.id), unreadCounts(user.id)]);
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
                {a.status !== "ditolak" && (
                  <DealLink id={a.id} accepted={a.status === "diterima"} unread={unread.get(a.id)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function EmployerView({ user }: { user: User }) {
  const [jobs, deals, unread] = await Promise.all([
    listJobsByEmployer(user.id),
    listDealsForEmployer(user.id),
    unreadCounts(user.id),
  ]);
  return (
    <>
      {deals.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold">Pelamar & deal</h2>
          <ul className="mt-4 grid gap-3">
            {deals.map((d) => (
              <li key={d.id} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{d.worker_name}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="text-sm text-slate-500">
                    {d.title} · {formatTanggal(d.work_date)}
                  </div>
                </div>
                <DealLink id={d.id} accepted={d.status === "diterima"} unread={unread.get(d.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}
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
                    <strong>{j.applicant_count}</strong> pelamar · <strong>{j.accepted_count}</strong>/{j.slots}{" "}
                    diterima
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function DealLink({ id, accepted, unread }: { id: number; accepted: boolean; unread?: number }) {
  return (
    <Link href={`/deal/${id}`} className="btn-outline">
      💬 Chat{accepted && " & Lokasi"}
      {!!unread && <span className="rounded-full bg-red-500 px-1.5 text-xs text-white">{unread}</span>}
    </Link>
  );
}
