import "server-only";
import { createHash, randomInt } from "node:crypto";
import { get, run } from "./db";
import { normalizePhone, sendWhatsApp } from "./whatsapp";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (userId: number, code: string) =>
  createHash("sha256").update(`${userId}:${code}`).digest("hex");

export type OtpState = { phone: string; expiresAt: string; waitSeconds: number } | null;

/** OTP yang sedang aktif untuk user (untuk menampilkan form input kode). */
export async function activeOtp(userId: number): Promise<OtpState> {
  const row = await get<{ phone: string; expires_at: string; created_at: string; attempts: number }>(
    "SELECT phone, expires_at, created_at, attempts FROM phone_otps WHERE user_id = ?",
    [userId],
  );
  if (!row || row.expires_at < new Date().toISOString() || row.attempts >= MAX_ATTEMPTS) return null;
  const wait = new Date(row.created_at).getTime() + RESEND_COOLDOWN_MS - Date.now();
  return { phone: row.phone, expiresAt: row.expires_at, waitSeconds: Math.max(0, Math.ceil(wait / 1000)) };
}

export async function sendPhoneOtp(user: { id: number; phone: string }): Promise<{ ok?: string; error?: string }> {
  const phone = normalizePhone(user.phone);
  if (!phone) return { error: "Nomor HP di profil tidak valid. Perbarui dulu nomor Anda." };

  const current = await activeOtp(user.id);
  if (current && current.waitSeconds > 0) return { error: `Tunggu ${current.waitSeconds} detik sebelum kirim ulang.` };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = Date.now();
  await run(
    `INSERT INTO phone_otps (user_id, phone, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET phone = excluded.phone, code_hash = excluded.code_hash, attempts = 0,
       expires_at = excluded.expires_at, created_at = excluded.created_at`,
    [user.id, phone, hash(user.id, code), new Date(now + CODE_TTL_MS).toISOString(), new Date(now).toISOString()],
  );
  const sent = await sendWhatsApp(
    phone,
    `*${code}* adalah kode verifikasi kerja-harian.id Anda.\n\nBerlaku 5 menit. Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku admin.`,
  );
  if (!sent) {
    await run("DELETE FROM phone_otps WHERE user_id = ?", [user.id]);
    return { error: "Kode gagal dikirim ke WhatsApp. Pastikan nomor aktif di WhatsApp, lalu coba lagi." };
  }
  return { ok: `Kode dikirim ke WhatsApp +${phone}.` };
}

export async function verifyPhoneOtp(user: { id: number; phone: string }, code: string): Promise<{ ok?: string; error?: string }> {
  const row = await get<{ phone: string; code_hash: string; attempts: number; expires_at: string }>(
    "SELECT phone, code_hash, attempts, expires_at FROM phone_otps WHERE user_id = ?",
    [user.id],
  );
  if (!row || row.expires_at < new Date().toISOString()) return { error: "Kode kedaluwarsa. Kirim kode baru." };
  if (row.attempts >= MAX_ATTEMPTS) return { error: "Terlalu banyak percobaan. Kirim kode baru." };
  if (row.phone !== normalizePhone(user.phone)) return { error: "Nomor HP berubah. Kirim kode baru." };

  if (!/^\d{6}$/.test(code) || hash(user.id, code) !== row.code_hash) {
    await run("UPDATE phone_otps SET attempts = attempts + 1 WHERE user_id = ?", [user.id]);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { error: left > 0 ? `Kode salah. Sisa ${left} percobaan.` : "Kode salah. Kirim kode baru." };
  }
  await run("UPDATE users SET phone_verified_at = ? WHERE id = ?", [new Date().toISOString(), user.id]);
  await run("DELETE FROM phone_otps WHERE user_id = ?", [user.id]);
  return { ok: "Nomor WhatsApp terverifikasi!" };
}
