import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DealRoom } from "@/components/deal-room";
import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { formatTanggal } from "@/lib/constants";
import { getDealForUser, listMessages, markRead } from "@/lib/deal";

export const metadata: Metadata = { title: "Chat & Lokasi" };

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "62")}`;
}

export default async function DealPage(props: PageProps<"/deal/[id]">) {
  const user = await requireUser();
  const id = Number((await props.params).id);
  const deal = Number.isInteger(id) ? getDealForUser(id, user.id) : null;
  if (!deal) notFound();

  const isWorker = user.id === deal.worker_id;
  const other = isWorker
    ? { id: deal.employer_id, name: deal.employer_name, phone: deal.employer_phone, role: "pemberi_kerja" as const }
    : { id: deal.worker_id, name: deal.worker_name, phone: deal.worker_phone, role: "pekerja" as const };
  const messages = listMessages(deal.id);
  if (messages.length) markRead(deal.id, user.id, messages[messages.length - 1].id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/dasbor" className="text-sm text-brand-700 hover:underline">
        ← Dasbor
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold">{deal.title}</h1>
            <StatusBadge status={deal.status} />
          </div>
          <p className="text-slate-600">
            {formatTanggal(deal.work_date)}
            {deal.start_time && ` · ${deal.start_time}–${deal.end_time}`} · {[deal.address, deal.city].filter(Boolean).join(", ")}
          </p>
          <p className="text-sm text-slate-500">
            {isWorker ? "Pemberi kerja" : "Pekerja"}: <strong>{other.name}</strong>
            {deal.status === "diterima" && ` · ${other.phone}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/lowongan/${deal.job_id}`} className="btn-outline">
            Lihat lowongan
          </Link>
          {deal.status === "diterima" && (
            <a href={waLink(other.phone)} target="_blank" rel="noreferrer" className="btn-outline">
              WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="mt-6">
        <DealRoom
          dealId={deal.id}
          me={{ id: user.id, name: user.name, role: user.role }}
          other={other}
          job={{ title: deal.title, lat: deal.job_lat, lng: deal.job_lng, address: deal.address }}
          initialMessages={messages}
          initialStatus={deal.status}
        />
      </div>
    </div>
  );
}
