import type { ApplicationStatus } from "@/lib/constants";

const STYLES: Record<ApplicationStatus, [string, string]> = {
  menunggu: ["Menunggu", "bg-amber-100 text-amber-800"],
  diterima: ["Diterima", "bg-brand-100 text-brand-700"],
  ditolak: ["Ditolak", "bg-red-100 text-red-700"],
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const [label, cls] = STYLES[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}
