import "server-only";

/**
 * Kirim email lewat Resend (https://resend.com, gratis 3.000 email/bulan).
 * Env: RESEND_API_KEY dan EMAIL_FROM (mis. "Kerja Harian <noreply@kerja-harian.id>").
 * Tanpa RESEND_API_KEY (pengembangan lokal), email hanya dicetak ke log server.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.log(`[email] RESEND_API_KEY belum diset — email tidak dikirim.\nKepada: ${to}\nSubjek: ${subject}\n${text}`);
    return false;
  }
  const from = process.env.EMAIL_FROM?.trim() || "Kerja Harian <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!res.ok) console.error(`[email] Resend gagal (${res.status}):`, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[email] Resend error:", err);
    return false;
  }
}

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
