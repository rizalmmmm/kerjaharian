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
import { sendPhoneOtp, verifyPhoneOtp } from "./phone-verification";
import { hasEmail, normalizePhone, placeholderEmail } from "./phone";

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

  if (role !== "pekerja" && role !== "pemberi_kerja") return { error: "Pilih dulu: cari kerja atau cari pekerja." };
  if (!name) return { error: "Nama wajib diisi." };
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) return { error: "Nomor HP tidak benar. Contoh: 081234567890" };
  if (password.length < 6) return { error: "Kata sandi minimal 6 huruf/angka." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Email tidak benar. Kosongkan saja jika tidak punya." };

  if (await get("SELECT 1 FROM users WHERE phone_norm = ?", [phoneNorm])) {
    return { error: "Nomor HP ini sudah terdaftar. Silakan masuk." };
  }
  if (email && (await get("SELECT 1 FROM users WHERE email = ?", [email]))) {
    return { error: "Email sudah terdaftar. Silakan masuk." };
  }
  const { id } = await run(
    "INSERT INTO users (name, email, phone, phone_norm, password_hash, role, city) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [name, email || placeholderEmail(phoneNorm), phone, phoneNorm, hashPassword(password), role, city],
  );
  await createSession(id);
  // Gagal kirim email tidak menggagalkan pendaftaran; pengguna bisa kirim ulang dari dasbor.
  if (email) await sendVerificationEmail({ id, name, email });
  redirect(safeNext(str(fd, "next")));
}

export async function resendVerification(): Promise<FormState> {
  const user = await requireUser();
  if (!hasEmail(user.email)) return { error: "Tambahkan email di profil terlebih dahulu." };
  if (user.email_verified_at) return { ok: "Email Anda sudah terverifikasi." };
  const wait = await resendWaitSeconds(user.id);
  if (wait > 0) return { error: `Tunggu ${wait} detik sebelum mengirim ulang.` };
  const sent = await sendVerificationEmail(user);
  return sent
    ? { ok: `Tautan verifikasi dikirim ke ${user.email}. Cek juga folder Spam.` }
    : { error: "Email gagal dikirim. Coba lagi nanti." };
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  // Bisa masuk dengan nomor HP (utama) atau email.
  const id = str(fd, "login") || str(fd, "email");
  const password = str(fd, "password");
  const phoneNorm = id.includes("@") ? null : normalizePhone(id);
  const row = await get<{ id: number; password_hash: string }>(
    phoneNorm
      ? "SELECT id, password_hash FROM users WHERE phone_norm = ?"
      : "SELECT id, password_hash FROM users WHERE email = ?",
    [phoneNorm ?? id.toLowerCase()],
  );
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "Nomor HP atau kata sandi salah." };
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
  const email = str(fd, "email").toLowerCase();
  if (!name) return { error: "Nama wajib diisi." };
  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) return { error: "Nomor HP tidak benar. Contoh: 081234567890" };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Email tidak benar. Kosongkan saja jika tidak punya." };
  const instagram = normalizeHandle(str(fd, "instagram"), "instagram");
  const facebook = normalizeHandle(str(fd, "facebook"), "facebook");
  if (instagram === null) return { error: "Username Instagram tidak valid." };
  if (facebook === null) return { error: "Username/tautan Facebook tidak valid." };

  const phoneChanged = phoneNorm !== normalizePhone(user.phone);
  if (phoneChanged && (await get("SELECT 1 FROM users WHERE phone_norm = ? AND id != ?", [phoneNorm, user.id]))) {
    return { error: "Nomor HP ini sudah dipakai akun lain." };
  }
  const oldEmail = hasEmail(user.email) ? user.email : "";
  const emailChanged = email !== oldEmail;
  if (emailChanged && email && (await get("SELECT 1 FROM users WHERE email = ? AND id != ?", [email, user.id]))) {
    return { error: "Email ini sudah dipakai akun lain." };
  }

  if (phoneChanged) {
    // Nomor berubah: status verifikasi WhatsApp harus diulang.
    await run("UPDATE users SET phone_verified_at = NULL WHERE id = ?", [user.id]);
    await run("DELETE FROM phone_otps WHERE user_id = ?", [user.id]);
  }
  if (emailChanged) {
    await run("UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?", [
      email || placeholderEmail(phoneNorm),
      user.id,
    ]);
    await run("DELETE FROM email_tokens WHERE user_id = ?", [user.id]);
  }
  await run(
    "UPDATE users SET name = ?, phone = ?, phone_norm = ?, city = ?, bio = ?, instagram = ?, facebook = ? WHERE id = ?",
    [name, phone, phoneNorm, str(fd, "city"), str(fd, "bio").slice(0, 500), instagram || null, facebook || null, user.id],
  );
  if (emailChanged && email) await sendVerificationEmail({ id: user.id, name, email });
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

export async function requestPhoneOtp(): Promise<FormState> {
  const user = await requireUser();
  if (user.phone_verified_at) return { ok: "Nomor WhatsApp Anda sudah terverifikasi." };
  const res = await sendPhoneOtp(user);
  revalidatePath("/dasbor");
  return res;
}

export async function confirmPhoneOtp(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const res = await verifyPhoneOtp(user, str(fd, "code").replace(/\s/g, ""));
  if (res.ok) revalidatePath("/", "layout");
  return res;
}
