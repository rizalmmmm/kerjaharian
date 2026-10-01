import "server-only";

/**
 * Kirim pesan WhatsApp lewat Fonnte (https://fonnte.com).
 * Env: FONNTE_TOKEN (token device dari dashboard Fonnte).
 * Tanpa token, pesan hanya dicetak ke log server. Set WHATSAPP_LOG_ONLY=1 untuk menguji alur
 * verifikasi secara lokal (kode OTP dibaca dari log).
 * Untuk pindah ke penyedia lain (mis. WhatsApp Business API resmi), cukup ganti fungsi ini.
 */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN?.trim();
  if (!token) {
    console.log(`[whatsapp] FONNTE_TOKEN belum diset — pesan tidak dikirim.\nKepada: ${phone}\n${message}`);
    return process.env.WHATSAPP_LOG_ONLY === "1";
  }
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body: new URLSearchParams({ target: phone, message, countryCode: "62" }),
    });
    const data = (await res.json().catch(() => ({}))) as { status?: boolean; reason?: string };
    if (!res.ok || data.status === false) {
      console.error(`[whatsapp] Fonnte gagal (${res.status}):`, data.reason ?? "");
      return false;
    }
    return true;
  } catch (err) {
    console.error("[whatsapp] Fonnte error:", err);
    return false;
  }
}

export function whatsappEnabled(): boolean {
  return Boolean(process.env.FONNTE_TOKEN?.trim()) || process.env.WHATSAPP_LOG_ONLY === "1";
}

export { normalizePhone } from "./phone";
