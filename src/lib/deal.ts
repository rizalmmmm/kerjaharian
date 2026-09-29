import "server-only";
import { all, get, run } from "./db";
import type { ApplicationStatus } from "./constants";

/**
 * "Deal" = satu lamaran, dilihat dari sisi pekerja atau pemberi kerjanya.
 * Chat tersedia selama lamaran belum ditolak; berbagi lokasi hanya setelah diterima.
 */
export type Deal = {
  id: number;
  status: ApplicationStatus;
  job_id: number;
  title: string;
  work_date: string;
  start_time: string;
  end_time: string;
  address: string;
  city: string;
  job_lat: number | null;
  job_lng: number | null;
  worker_id: number;
  worker_name: string;
  worker_phone: string;
  employer_id: number;
  employer_name: string;
  employer_phone: string;
};

export type Message = { id: number; sender_id: number; body: string; created_at: string };
export type LiveLocation = { user_id: number; lat: number; lng: number; accuracy: number; updated_at: string };

/** Lokasi dianggap basi (tidak lagi dibagikan) setelah 10 menit tanpa pembaruan. */
const LOCATION_TTL_MS = 10 * 60 * 1000;

export async function getDealForUser(applicationId: number, userId: number): Promise<Deal | null> {
  const deal = await get<Deal>(
    `SELECT a.id, a.status, j.id AS job_id, j.title, j.work_date, j.start_time, j.end_time, j.address, j.city,
            j.lat AS job_lat, j.lng AS job_lng,
            w.id AS worker_id, w.name AS worker_name, w.phone AS worker_phone,
            e.id AS employer_id, e.name AS employer_name, e.phone AS employer_phone
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN users w ON w.id = a.worker_id
     JOIN users e ON e.id = j.employer_id
     WHERE a.id = ?`,
    [applicationId],
  );
  if (!deal || (deal.worker_id !== userId && deal.employer_id !== userId)) return null;
  return deal;
}

export const canChat = (d: Deal) => d.status !== "ditolak";
export const canShareLocation = (d: Deal) => d.status === "diterima";

/** Tanggal hari ini (WIB) dalam format YYYY-MM-DD. */
export const todayWib = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

/** Ulasan bisa diberikan setelah deal diterima dan hari kerja sudah tiba. */
export const canReview = (d: Deal) => d.status === "diterima" && d.work_date <= todayWib();

export function listMessages(applicationId: number, afterId = 0): Promise<Message[]> {
  return all<Message>(
    "SELECT id, sender_id, body, created_at FROM messages WHERE application_id = ? AND id > ? ORDER BY id LIMIT 200",
    [applicationId, afterId],
  );
}

export async function addMessage(applicationId: number, senderId: number, body: string): Promise<Message> {
  const { id } = await run("INSERT INTO messages (application_id, sender_id, body) VALUES (?, ?, ?)", [
    applicationId,
    senderId,
    body,
  ]);
  return (await get<Message>("SELECT id, sender_id, body, created_at FROM messages WHERE id = ?", [id]))!;
}

export async function markRead(applicationId: number, userId: number, lastId: number) {
  await run(
    `INSERT INTO message_reads (application_id, user_id, last_read_id) VALUES (?, ?, ?)
     ON CONFLICT (application_id, user_id) DO UPDATE SET last_read_id = MAX(last_read_id, excluded.last_read_id)`,
    [applicationId, userId, lastId],
  );
}

/** Jumlah pesan belum dibaca per lamaran untuk user tertentu. */
export async function unreadCounts(userId: number): Promise<Map<number, number>> {
  const rows = await all<{ id: number; n: number }>(
    `SELECT m.application_id AS id, COUNT(*) AS n
     FROM messages m
     JOIN applications a ON a.id = m.application_id
     JOIN jobs j ON j.id = a.job_id
     LEFT JOIN message_reads r ON r.application_id = m.application_id AND r.user_id = ?
     WHERE (a.worker_id = ? OR j.employer_id = ?) AND m.sender_id != ? AND m.id > COALESCE(r.last_read_id, 0)
     GROUP BY m.application_id`,
    [userId, userId, userId, userId],
  );
  return new Map(rows.map((r) => [r.id, r.n]));
}

export async function upsertLocation(applicationId: number, userId: number, lat: number, lng: number, accuracy: number) {
  await run(
    `INSERT INTO live_locations (application_id, user_id, lat, lng, accuracy, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (application_id, user_id) DO UPDATE SET
       lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy, updated_at = excluded.updated_at`,
    [applicationId, userId, lat, lng, accuracy, new Date().toISOString()],
  );
}

export async function clearLocation(applicationId: number, userId: number) {
  await run("DELETE FROM live_locations WHERE application_id = ? AND user_id = ?", [applicationId, userId]);
}

export function listLocations(applicationId: number): Promise<LiveLocation[]> {
  const since = new Date(Date.now() - LOCATION_TTL_MS).toISOString();
  return all<LiveLocation>(
    "SELECT user_id, lat, lng, accuracy, updated_at FROM live_locations WHERE application_id = ? AND updated_at > ?",
    [applicationId, since],
  );
}
