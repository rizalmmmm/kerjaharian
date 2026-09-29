import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { get, run } from "./db";
import { sendEmail } from "./email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
/** Jeda minimal antar pengiriman ulang, untuk mencegah spam. */
export const RESEND_COOLDOWN_MS = 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

async function siteUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Detik tersisa sebelum boleh kirim ulang (0 = boleh). */
export async function resendWaitSeconds(userId: number): Promise<number> {
  const last = await get<{ created_at: string }>(
    "SELECT created_at FROM email_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  if (!last) return 0;
  const left = new Date(last.created_at).getTime() + RESEND_COOLDOWN_MS - Date.now();
  return Math.max(0, Math.ceil(left / 1000));
}

export async function sendVerificationEmail(user: { id: number; name: string; email: string }): Promise<boolean> {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await run("DELETE FROM email_tokens WHERE user_id = ?", [user.id]);
  await run("INSERT INTO email_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)", [
    hash(token),
    user.id,
    new Date(now + TOKEN_TTL_MS).toISOString(),
    new Date(now).toISOString(),
  ]);

  const link = `${await siteUrl()}/verifikasi-email?token=${token}`;
  const name = user.name.split(" ")[0];
  const text = `Halo ${name},\n\nKlik tautan berikut untuk memverifikasi email Anda di kerja-harian.id:\n${link}\n\nTautan berlaku 24 jam. Abaikan email ini jika Anda tidak mendaftar.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
  <h2 style="color:#047857">kerja-harian.id</h2>
  <p>Halo ${escapeHtml(name)},</p>
  <p>Klik tombol di bawah untuk memverifikasi email Anda.</p>
  <p><a href="${link}" style="display:inline-block;background:#059669;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Verifikasi email</a></p>
  <p style="font-size:13px;color:#64748b">Atau salin tautan ini: ${link}<br>Tautan berlaku 24 jam. Abaikan email ini jika Anda tidak mendaftar.</p>
</div>`;
  return sendEmail(user.email, "Verifikasi email Anda — kerja-harian.id", html, text);
}

/** Tandai email terverifikasi bila token valid. Mengembalikan id user, atau null. */
export async function consumeVerificationToken(token: string): Promise<number | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await get<{ user_id: number; expires_at: string }>(
    "SELECT user_id, expires_at FROM email_tokens WHERE token_hash = ?",
    [hash(token)],
  );
  if (!row || row.expires_at < new Date().toISOString()) return null;
  await run("UPDATE users SET email_verified_at = ? WHERE id = ? AND email_verified_at IS NULL", [
    new Date().toISOString(),
    row.user_id,
  ]);
  await run("DELETE FROM email_tokens WHERE user_id = ?", [row.user_id]);
  return row.user_id;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
