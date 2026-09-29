export const CATEGORIES = [
  "Gudang & Logistik",
  "Retail & Toko",
  "Event",
  "Konstruksi & Renovasi",
  "Kurir & Pengiriman",
  "Kebersihan",
  "Rumah Makan & Katering",
  "Pertanian & Perkebunan",
  "Makeup (MUA)",
  "Lainnya",
] as const;

export const WAGE_UNITS = {
  hari: "/ hari",
  jam: "/ jam",
  proyek: "/ proyek",
} as const;

export type WageUnit = keyof typeof WAGE_UNITS;
export type Role = "pekerja" | "pemberi_kerja";
export type ApplicationStatus = "menunggu" | "diterima" | "ditolak";

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatTanggal(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
