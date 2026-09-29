"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { batch, get, run } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, getCurrentUser, requireUser } from "./auth";
import { CATEGORIES, WAGE_UNITS, type Role } from "./constants";
import { resendWaitSeconds, sendVerificationEmail } from "./verification";
import { canReview, getDealForUser } from "./deal";
import { normalizeHandle } from "./profile";

export type FormState = { error?: string; ok?: string } | undefined;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dasbor";
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const phone = str(fd, "phone");
  const city = str(fd, "city");
  const password = str(fd, "password");
  const role = str(fd, "role") as Role;

  if (!name || !email || !password || !phone) return { error: "Nama, email, nomor HP, dan kata sandi wajib diisi." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Format email tidak valid." };
  if (!/^[0-9+\-\s]{8,16}$/.test(phone)) return { error: "Nomor HP tidak valid." };
  if (password.length < 8) return { error: "Kata sandi minimal 8 karakter." };
  if (role !== "pekerja" && role !== "pemberi_kerja") return { error: "Pilih jenis akun." };

  if (await get("SELECT 1 FROM users WHERE email = ?", [email])) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }
  const { id } = await run(
    "INSERT INTO users (name, email, phone, password_hash, role, city) VALUES (?, ?, ?, ?, ?, ?)",
    [name, email, phone, hashPassword(password), role, city],
  );
  await createSession(id);
  // Gagal kirim email tidak menggagalkan pendaftaran; pengguna bisa kirim ulang dari dasbor.
  await sendVerificationEmail({ id, name, email });
  redirect(safeNext(str(fd, "next")));
}

export async function resendVerification(): Promise<FormState> {
  const user = await requireUser();
  if (user.email_verified_at) return { ok: "Email Anda sudah terverifikasi." };
  const wait = await resendWaitSeconds(user.id);
  if (wait > 0) return { error: `Tunggu ${wait} detik sebelum mengirim ulang.` };
  const sent = await sendVerificationEmail(user);
  return sent
    ? { ok: `Tautan verifikasi dikirim ke ${user.email}. Cek juga folder Spam.` }
    : { error: "Email gagal dikirim. Coba lagi nanti." };
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const row = await get<{ id: number; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = ?", [
    email,
  ]);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "Email atau kata sandi salah." };
  }
  await createSession(row.id);
  redirect(safeNext(str(fd, "next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function createJob(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("pemberi_kerja");
  const title = str(fd, "title");
  const category = str(fd, "category");
  const description = str(fd, "description");
  const city = str(fd, "city");
  const address = str(fd, "address");
  const wage = Number(str(fd, "wage"));
  const wageUnit = str(fd, "wage_unit");
  const workDate = str(fd, "work_date");
  const startTime = str(fd, "start_time");
  const endTime = str(fd, "end_time");
  const slots = Number(str(fd, "slots") || "1");
  const lat = str(fd, "lat") ? Number(str(fd, "lat")) : null;
  const lng = str(fd, "lng") ? Number(str(fd, "lng")) : null;

  if (!title || !description || !city) return { error: "Judul, deskripsi, dan kota wajib diisi." };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: "Pilih kategori pekerjaan." };
  if (!(wageUnit in WAGE_UNITS)) return { error: "Pilih satuan upah." };
  if (!Number.isInteger(wage) || wage < 1000) return { error: "Upah minimal Rp1.000." };
  if (!Number.isInteger(slots) || slots < 1 || slots > 500) return { error: "Jumlah pekerja antara 1–500." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) return { error: "Tanggal kerja wajib diisi." };
  if (workDate < new Date().toISOString().slice(0, 10)) return { error: "Tanggal kerja tidak boleh di masa lalu." };
  const validPin = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const { id } = await run(
    `INSERT INTO jobs (employer_id, title, category, description, city, address, wage, wage_unit, work_date, start_time, end_time, slots, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      title,
      category,
      description,
      city,
      address,
      wage,
      wageUnit,
      workDate,
      startTime,
      endTime,
      slots,
      validPin ? lat : null,
      validPin ? lng : null,
    ],
  );
  revalidatePath("/lowongan");
  redirect(`/lowongan/${id}`);
}

export async function setJobStatus(jobId: number, status: "buka" | "tutup") {
  const user = await requireUser("pemberi_kerja");
  await run("UPDATE jobs SET status = ? WHERE id = ? AND employer_id = ?", [status, jobId, user.id]);
  revalidatePath(`/lowongan/${jobId}`);
  revalidatePath("/dasbor");
}

export async function applyJob(_: FormState, fd: FormData): Promise<FormState> {
  const jobId = Number(str(fd, "job_id"));
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?next=/lowongan/${jobId}`);
  if (user.role !== "pekerja") return { error: "Hanya akun pekerja yang dapat melamar." };

  const job = await get<{ status: string }>("SELECT status FROM jobs WHERE id = ?", [jobId]);
  if (!job || job.status !== "buka") return { error: "Lowongan sudah ditutup." };

  const result = await run("INSERT OR IGNORE INTO applications (job_id, worker_id, message) VALUES (?, ?, ?)", [
    jobId,
    user.id,
    str(fd, "message").slice(0, 1000),
  ]);
  if (result.changes === 0) return { error: "Anda sudah melamar pekerjaan ini." };

  revalidatePath(`/lowongan/${jobId}`);
  return { ok: "Lamaran terkirim! Pemberi kerja akan menghubungi Anda." };
}

export async function withdrawApplication(jobId: number) {
  const user = await requireUser("pekerja");
  const app = await get<{ id: number }>(
    "SELECT id FROM applications WHERE job_id = ? AND worker_id = ? AND status = 'menunggu'",
    [jobId, user.id],
  );
  if (app) {
    // Hapus eksplisit (tidak bergantung pada PRAGMA foreign_keys yang belum tentu aktif di Turso).
    await batch(
      ["messages", "message_reads", "live_locations"]
        .map((t) => ({ sql: `DELETE FROM ${t} WHERE application_id = ?`, args: [app.id] }))
        .concat({ sql: "DELETE FROM applications WHERE id = ?", args: [app.id] }),
    );
  }
  revalidatePath(`/lowongan/${jobId}`);
  revalidatePath("/dasbor");
}

export async function decideApplication(applicationId: number, status: "diterima" | "ditolak" | "menunggu") {
  const user = await requireUser("pemberi_kerja");
  const row = await get<{ job_id: number }>(
    `SELECT a.job_id FROM applications a JOIN jobs j ON j.id = a.job_id
     WHERE a.id = ? AND j.employer_id = ?`,
    [applicationId, user.id],
  );
  if (!row) return;
  await run("UPDATE applications SET status = ? WHERE id = ?", [status, applicationId]);
  // Lokasi live hanya boleh ada selama lamaran berstatus diterima.
  if (status !== "diterima") await run("DELETE FROM live_locations WHERE application_id = ?", [applicationId]);
  revalidatePath(`/lowongan/${row.job_id}`);
  revalidatePath(`/deal/${applicationId}`);
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(fd, "name");
  const phone = str(fd, "phone");
  if (!name) return { error: "Nama wajib diisi." };
  if (!/^[0-9+\-\s]{8,16}$/.test(phone)) return { error: "Nomor HP tidak valid." };
  const instagram = normalizeHandle(str(fd, "instagram"), "instagram");
  const facebook = normalizeHandle(str(fd, "facebook"), "facebook");
  if (instagram === null) return { error: "Username Instagram tidak valid." };
  if (facebook === null) return { error: "Username/tautan Facebook tidak valid." };
  await run("UPDATE users SET name = ?, phone = ?, city = ?, bio = ?, instagram = ?, facebook = ? WHERE id = ?", [
    name,
    phone,
    str(fd, "city"),
    str(fd, "bio").slice(0, 500),
    instagram || null,
    facebook || null,
    user.id,
  ]);
  revalidatePath("/", "layout");
  return { ok: "Profil tersimpan." };
}

export async function submitReview(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const dealId = Number(str(fd, "deal_id"));
  const rating = Number(str(fd, "rating"));
  const comment = str(fd, "comment").slice(0, 500);
  const deal = Number.isInteger(dealId) ? await getDealForUser(dealId, user.id) : null;
  if (!deal) return { error: "Deal tidak ditemukan." };
  if (!canReview(deal)) return { error: "Ulasan bisa diberikan setelah hari kerja tiba." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Pilih 1–5 bintang." };

  const revieweeId = user.id === deal.worker_id ? deal.employer_id : deal.worker_id;
  const res = await run(
    "INSERT OR IGNORE INTO reviews (application_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
    [deal.id, user.id, revieweeId, rating, comment],
  );
  if (res.changes === 0) return { error: "Anda sudah memberi ulasan untuk pekerjaan ini." };
  revalidatePath(`/deal/${deal.id}`);
  revalidatePath(`/profil/${revieweeId}`);
  return { ok: "Terima kasih! Ulasan Anda tersimpan." };
}
