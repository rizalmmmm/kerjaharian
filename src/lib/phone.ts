/** Normalisasi nomor Indonesia ke format 628xxxxxxxxx. Null bila tidak valid. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^628\d{7,11}$/.test(d) ? d : null;
}

/**
 * Kolom users.email wajib & unik di skema lama, jadi akun tanpa email memakai alamat pengganti
 * di domain .invalid (tidak pernah bisa menerima email). Gunakan hasEmail() sebelum menampilkan/mengirim.
 */
const NO_EMAIL_DOMAIN = "@tanpa-email.invalid";
export const placeholderEmail = (phoneNorm: string) => `hp${phoneNorm}${NO_EMAIL_DOMAIN}`;
export const hasEmail = (email: string | null | undefined): email is string =>
  Boolean(email) && !email!.endsWith(NO_EMAIL_DOMAIN);
