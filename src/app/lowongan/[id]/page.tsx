import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/forms";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { applyJob, decideApplication, setJobStatus, withdrawApplication } from "@/lib/actions";
import { WAGE_UNITS, formatRupiah, formatTanggal } from "@/lib/constants";
import { getApplication, getJob, listApplicants } from "@/lib/queries";
import { unreadCounts } from "@/lib/deal";

async function load(params: Promise<{ id: string }>) {
  const { id } = await params;
  const jobId = Number(id);
  const job = Number.isInteger(jobId) ? await getJob(jobId) : null;
  if (!job) notFound();
  return job;
}

export async function generateMetadata(props: PageProps<"/lowongan/[id]">): Promise<Metadata> {
  const job = await load(props.params);
  return { title: `${job.title} di ${job.city}`, description: job.description.slice(0, 160) };
}

function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default async function JobDetailPage(props: PageProps<"/lowongan/[id]">) {
  const job = await load(props.params);
  const user = await getCurrentUser();
  const isOwner = user?.id === job.employer_id;
  const remaining = Math.max(job.slots - job.accepted_count, 0);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <article className="card p-6">
        <Link href="/lowongan" className="text-sm text-brand-700 hover:underline">
          ← Semua lowongan
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {job.category}
          </span>
          {job.status === "tutup" && (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-700">Ditutup</span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-extrabold">{job.title}</h1>
        <p className="text-slate-500">{job.employer_name}</p>

        <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <Info label="Upah" value={`${formatRupiah(job.wage)} ${WAGE_UNITS[job.wage_unit]}`} strong />
          <Info label="Tanggal" value={formatTanggal(job.work_date)} />
          <Info label="Jam kerja" value={job.start_time ? `${job.start_time}–${job.end_time}` : "Fleksibel"} />
          <Info label="Kebutuhan" value={`${remaining} dari ${job.slots} orang lagi`} />
          <Info label="Lokasi" value={[job.address, job.city].filter(Boolean).join(", ")} />
          <Info label="Pelamar" value={`${job.applicant_count} orang`} />
        </div>

        <h2 className="mt-6 font-bold">Deskripsi pekerjaan</h2>
        <p className="mt-2 whitespace-pre-line text-slate-700">{job.description}</p>
      </article>

      <aside className="flex flex-col gap-4">
        {isOwner ? <OwnerPanel jobId={job.id} status={job.status} /> : <ApplyPanel jobId={job.id} status={job.status} />}
      </aside>

      {isOwner && <ApplicantList jobId={job.id} jobTitle={job.title} ownerId={job.employer_id} />}
    </div>
  );
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={strong ? "text-lg font-extrabold text-brand-700" : "font-medium"}>{value}</div>
    </div>
  );
}

async function ApplyPanel({ jobId, status }: { jobId: number; status: "buka" | "tutup" }) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="card p-5">
        <h2 className="font-bold">Tertarik dengan pekerjaan ini?</h2>
        <p className="mt-1 text-sm text-slate-600">Masuk atau daftar sebagai pekerja untuk melamar.</p>
        <div className="mt-4 flex gap-2">
          <Link href={`/masuk?next=/lowongan/${jobId}`} className="btn-primary flex-1">
            Masuk
          </Link>
          <Link href={`/daftar?peran=pekerja&next=/lowongan/${jobId}`} className="btn-outline flex-1">
            Daftar
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== "pekerja") {
    return (
      <div className="card p-5 text-sm text-slate-600">Anda masuk sebagai pemberi kerja. Hanya pekerja yang dapat melamar.</div>
    );
  }

  const application = await getApplication(jobId, user.id);
  if (application) {
    return (
      <div className="card p-5">
        <h2 className="font-bold">Lamaran Anda</h2>
        <div className="mt-2">
          <StatusBadge status={application.status} />
        </div>
        {application.status !== "ditolak" && (
          <Link href={`/deal/${application.id}`} className="btn-primary mt-4 w-full">
            💬 Chat{application.status === "diterima" && " & lacak lokasi"}
          </Link>
        )}
        {application.status === "menunggu" && (
          <form action={withdrawApplication.bind(null, jobId)} className="mt-2">
            <button className="btn-outline w-full">Batalkan lamaran</button>
          </form>
        )}
      </div>
    );
  }

  if (status === "tutup") {
    return <div className="card p-5 text-sm text-slate-600">Lowongan ini sudah ditutup.</div>;
  }

  return (
    <div className="card p-5">
      <h2 className="font-bold">Lamar pekerjaan ini</h2>
      <ActionForm action={applyJob} submitLabel="Kirim lamaran" pendingLabel="Mengirim…" className="mt-3 grid gap-3">
        <input type="hidden" name="job_id" value={jobId} />
        <div>
          <label htmlFor="message" className="label">
            Pesan untuk pemberi kerja (opsional)
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={1000}
            className="input"
            placeholder="Ceritakan pengalaman singkat Anda…"
          />
        </div>
      </ActionForm>
    </div>
  );
}

function OwnerPanel({ jobId, status }: { jobId: number; status: "buka" | "tutup" }) {
  const next = status === "buka" ? "tutup" : "buka";
  return (
    <div className="card p-5">
      <h2 className="font-bold">Kelola lowongan</h2>
      <p className="mt-1 text-sm text-slate-600">
        Status: <strong>{status === "buka" ? "Dibuka" : "Ditutup"}</strong>
      </p>
      <form action={setJobStatus.bind(null, jobId, next)} className="mt-4">
        <button className="btn-outline w-full">{status === "buka" ? "Tutup lowongan" : "Buka kembali"}</button>
      </form>
    </div>
  );
}

async function ApplicantList({ jobId, jobTitle, ownerId }: { jobId: number; jobTitle: string; ownerId: number }) {
  const [applicants, unread] = await Promise.all([listApplicants(jobId), unreadCounts(ownerId)]);
  return (
    <section className="card p-6 lg:col-span-2">
      <h2 className="text-lg font-bold">Pelamar ({applicants.length})</h2>
      {applicants.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Belum ada pelamar.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200">
          {applicants.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{a.name}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-sm text-slate-500">
                  {a.city || "—"} · {a.phone}
                </div>
                {a.bio && <p className="mt-1 text-sm text-slate-600">{a.bio}</p>}
                {a.message && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm italic text-slate-700">“{a.message}”</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {a.status !== "ditolak" && (
                  <Link href={`/deal/${a.id}`} className="btn-outline">
                    💬 Chat{a.status === "diterima" && " & Lokasi"}
                    {!!unread.get(a.id) && (
                      <span className="rounded-full bg-red-500 px-1.5 text-xs text-white">{unread.get(a.id)}</span>
                    )}
                  </Link>
                )}
                <a
                  href={waLink(a.phone, `Halo ${a.name}, terkait lamaran "${jobTitle}" di kerja-harian.id…`)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline"
                >
                  WhatsApp
                </a>
                {a.status !== "diterima" && (
                  <form action={decideApplication.bind(null, a.id, "diterima")}>
                    <button className="btn-primary">Terima</button>
                  </form>
                )}
                {a.status !== "ditolak" && (
                  <form action={decideApplication.bind(null, a.id, "ditolak")}>
                    <button className="btn-outline text-red-600">Tolak</button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
