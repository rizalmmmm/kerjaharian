"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapView, distanceKm, type MapPoint } from "./map";

type Message = { id: number; sender_id: number; body: string; created_at: string };
type LiveLocation = { user_id: number; lat: number; lng: number; accuracy: number; updated_at: string };
type Party = { id: number; name: string; role: "pekerja" | "pemberi_kerja" };

const POLL_MS = 3000;
/** Kirim posisi paling sering tiap 5 detik agar hemat baterai & server. */
const SEND_MIN_MS = 5000;

const COLORS = { pekerja: "#2563eb", pemberi_kerja: "#ea580c" } as const;
const EMOJI = { pekerja: "🧑‍🔧", pemberi_kerja: "🏠" } as const;

function timeAgo(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} dtk lalu`;
  return `${Math.round(s / 60)} mnt lalu`;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function DealRoom({
  dealId,
  me,
  other,
  job,
  initialMessages,
  initialStatus,
}: {
  dealId: number;
  me: Party;
  other: Party;
  job: { title: string; lat: number | null; lng: number | null; address: string };
  initialMessages: Message[];
  initialStatus: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [status, setStatus] = useState(initialStatus);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [, setTick] = useState(0);

  const lastId = useRef(initialMessages.at(-1)?.id ?? 0);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const locationAllowed = status === "diterima";
  const chatAllowed = status !== "ditolak";

  const appendMessages = useCallback((incoming: Message[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
    });
    lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
  }, []);

  // Polling pesan & lokasi.
  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/deal/${dealId}/sync?after=${lastId.current}`, { cache: "no-store" });
        if (!res.ok || stop) return;
        const data = (await res.json()) as { status: string; messages: Message[]; locations: LiveLocation[] };
        appendMessages(data.messages);
        setLocations(data.locations);
        setStatus(data.status);
      } catch {
        /* jaringan putus sementara — coba lagi di putaran berikut */
      }
    }
    poll();
    const t = setInterval(() => {
      poll();
      setTick((n) => n + 1);
    }, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [dealId, appendMessages]);

  // Gulir ke pesan terbaru.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const stopSharing = useCallback(
    (notify = true) => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setSharing(false);
      if (notify) fetch(`/api/deal/${dealId}/location`, { method: "DELETE", keepalive: true }).catch(() => {});
    },
    [dealId],
  );

  function startSharing() {
    if (!("geolocation" in navigator)) return setGeoError("Browser ini tidak mendukung GPS.");
    if (!window.isSecureContext) return setGeoError("GPS hanya berjalan di HTTPS atau localhost.");
    setGeoError("");
    setSharing(true);
    lastSent.current = 0;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < SEND_MIN_MS) return;
        lastSent.current = now;
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        // Tampilkan posisi sendiri langsung tanpa menunggu polling.
        setLocations((prev) => [
          ...prev.filter((l) => l.user_id !== me.id),
          { user_id: me.id, lat, lng, accuracy, updated_at: new Date().toISOString() },
        ]);
        fetch(`/api/deal/${dealId}/location`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng, accuracy }),
        }).catch(() => {});
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan izin lokasi untuk situs ini di pengaturan browser."
            : "Gagal membaca GPS. Coba lagi di tempat terbuka.",
        );
        stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }

  // Hentikan GPS saat halaman ditutup, atau saat deal tidak lagi berstatus diterima.
  useEffect(() => () => stopSharing(false), [stopSharing]);
  useEffect(() => {
    if (!locationAllowed && watchId.current !== null) stopSharing(false);
  }, [locationAllowed, stopSharing]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/deal/${dealId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        appendMessages([((await res.json()) as { message: Message }).message]);
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  const byUser = new Map(locations.map((l) => [l.user_id, l]));
  const mine = byUser.get(me.id);
  const theirs = byUser.get(other.id);
  const jobPoint = job.lat !== null && job.lng !== null ? { lat: job.lat, lng: job.lng } : null;
  const worker = me.role === "pekerja" ? mine : theirs;

  const points: MapPoint[] = [];
  if (jobPoint) points.push({ id: "job", ...jobPoint, label: `Lokasi kerja: ${job.title}`, emoji: "📍", color: "#059669" });
  for (const [party, loc] of [
    [me, mine],
    [other, theirs],
  ] as const) {
    if (loc) {
      points.push({
        id: `u${party.id}`,
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
        label: party.id === me.id ? "Posisi Anda" : `${party.name} (${timeAgo(loc.updated_at)})`,
        emoji: EMOJI[party.role],
        color: COLORS[party.role],
      });
    }
  }
  const distance = worker && jobPoint ? distanceKm(worker, jobPoint) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Lacak lokasi (GPS)</h2>
          {locationAllowed &&
            (sharing ? (
              <button onClick={() => stopSharing()} className="btn-outline text-red-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Berhenti bagikan lokasi
              </button>
            ) : (
              <button onClick={startSharing} className="btn-primary">
                📡 Bagikan lokasi saya
              </button>
            ))}
        </div>

        {!locationAllowed ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Pelacakan lokasi aktif setelah lamaran <strong>diterima</strong> (deal).
          </p>
        ) : (
          <>
            <div className="mt-4">
              <MapView points={points} line={worker && jobPoint ? [[worker.lat, worker.lng], [jobPoint.lat, jobPoint.lng]] : undefined} />
            </div>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <Legend color="#059669" emoji="📍" title="Lokasi kerja" desc={jobPoint ? job.address || "Ditandai di peta" : "Belum ditandai"} />
              <Legend
                color={COLORS[me.role]}
                emoji={EMOJI[me.role]}
                title="Anda"
                desc={mine ? (sharing ? "Sedang dibagikan" : `Terakhir ${timeAgo(mine.updated_at)}`) : "Tidak dibagikan"}
              />
              <Legend
                color={COLORS[other.role]}
                emoji={EMOJI[other.role]}
                title={other.name}
                desc={theirs ? `Diperbarui ${timeAgo(theirs.updated_at)}` : "Belum membagikan lokasi"}
              />
            </ul>
            {distance !== null && (
              <p className="mt-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
                Pekerja berjarak <strong>{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</strong>{" "}
                (garis lurus) dari lokasi kerja.
              </p>
            )}
            {geoError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{geoError}</p>}
            <p className="mt-3 text-xs text-slate-500">
              Lokasi hanya terlihat oleh kedua pihak dalam deal ini, hanya selama halaman ini terbuka dan tombol berbagi
              aktif, dan otomatis hilang 10 menit setelah pembaruan terakhir.
            </p>
          </>
        )}
      </section>

      <section className="card flex h-[600px] flex-col">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-bold">Chat dengan {other.name}</h2>
          <p className="text-xs text-slate-500">{other.role === "pekerja" ? "Pekerja" : "Pemberi kerja"}</p>
        </div>
        <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 && <p className="text-center text-sm text-slate-400">Belum ada pesan. Mulai percakapan!</p>}
          {messages.map((m) => {
            const own = m.sender_id === me.id;
            return (
              <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${own ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${own ? "text-brand-100" : "text-slate-400"}`}>{clock(m.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
        {chatAllowed ? (
          <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              placeholder="Tulis pesan…"
              aria-label="Pesan"
              className="input"
            />
            <button className="btn-primary" disabled={sending || !draft.trim()}>
              Kirim
            </button>
          </form>
        ) : (
          <p className="border-t border-slate-200 p-3 text-center text-sm text-slate-500">Chat ditutup karena lamaran ditolak.</p>
        )}
      </section>
    </div>
  );
}

function Legend({ color, emoji, title, desc }: { color: string; emoji: string; title: string; desc: string }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm" style={{ background: color }}>
        {emoji}
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-slate-500">{desc}</span>
      </span>
    </li>
  );
}
