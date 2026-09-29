"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, getCurrentUser, requireUser } from "./auth";
import { CATEGORIES, WAGE_UNITS, type Role } from "./constants";

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

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }
  const { lastInsertRowid } = db
    .prepare("INSERT INTO users (name, email, phone, password_hash, role, city) VALUES (?, ?, ?, ?, ?, ?)")
    .run(name, email, phone, hashPassword(password), role, city);
  await createSession(lastInsertRowid);
  redirect(safeNext(str(fd, "next")));
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const row = getDb().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: number; password_hash: string }
    | undefined;
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

  const { lastInsertRowid } = getDb()
    .prepare(
      `INSERT INTO jobs (employer_id, title, category, description, city, address, wage, wage_unit, work_date, start_time, end_time, slots, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      user.id, title, category, description, city, address, wage, wageUnit, workDate, startTime, endTime, slots,
      validPin ? lat : null, validPin ? lng : null,
    );
  revalidatePath("/lowongan");
  redirect(`/lowongan/${lastInsertRowid}`);
}

export async function setJobStatus(jobId: number, status: "buka" | "tutup") {
  const user = await requireUser("pemberi_kerja");
  getDb().prepare("UPDATE jobs SET status = ? WHERE id = ? AND employer_id = ?").run(status, jobId, user.id);
  revalidatePath(`/lowongan/${jobId}`);
  revalidatePath("/dasbor");
}

export async function applyJob(_: FormState, fd: FormData): Promise<FormState> {
  const jobId = Number(str(fd, "job_id"));
  const user = await getCurrentUser();
  if (!user) redirect(`/masuk?next=/lowongan/${jobId}`);
  if (user.role !== "pekerja") return { error: "Hanya akun pekerja yang dapat melamar." };

  const db = getDb();
  const job = db.prepare("SELECT status, employer_id FROM jobs WHERE id = ?").get(jobId) as
    | { status: string; employer_id: number }
    | undefined;
  if (!job || job.status !== "buka") return { error: "Lowongan sudah ditutup." };

  const result = db
    .prepare("INSERT OR IGNORE INTO applications (job_id, worker_id, message) VALUES (?, ?, ?)")
    .run(jobId, user.id, str(fd, "message").slice(0, 1000));
  if (result.changes === 0) return { error: "Anda sudah melamar pekerjaan ini." };

  revalidatePath(`/lowongan/${jobId}`);
  return { ok: "Lamaran terkirim! Pemberi kerja akan menghubungi Anda." };
}

export async function withdrawApplication(jobId: number) {
  const user = await requireUser("pekerja");
  getDb()
    .prepare("DELETE FROM applications WHERE job_id = ? AND worker_id = ? AND status = 'menunggu'")
    .run(jobId, user.id);
  revalidatePath(`/lowongan/${jobId}`);
  revalidatePath("/dasbor");
}

export async function decideApplication(applicationId: number, status: "diterima" | "ditolak" | "menunggu") {
  const user = await requireUser("pemberi_kerja");
  const row = getDb()
    .prepare(
      `SELECT a.job_id FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ? AND j.employer_id = ?`,
    )
    .get(applicationId, user.id) as { job_id: number } | undefined;
  if (!row) return;
  getDb().prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, applicationId);
  // Lokasi live hanya boleh ada selama lamaran berstatus diterima.
  if (status !== "diterima") getDb().prepare("DELETE FROM live_locations WHERE application_id = ?").run(applicationId);
  revalidatePath(`/lowongan/${row.job_id}`);
  revalidatePath(`/deal/${applicationId}`);
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(fd, "name");
  const phone = str(fd, "phone");
  if (!name) return { error: "Nama wajib diisi." };
  if (!/^[0-9+\-\s]{8,16}$/.test(phone)) return { error: "Nomor HP tidak valid." };
  getDb()
    .prepare("UPDATE users SET name = ?, phone = ?, city = ?, bio = ? WHERE id = ?")
    .run(name, phone, str(fd, "city"), str(fd, "bio").slice(0, 500), user.id);
  revalidatePath("/", "layout");
  return { ok: "Profil tersimpan." };
}
