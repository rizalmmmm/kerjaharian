import "server-only";
import { all, get } from "./db";
import type { Role } from "./constants";
export { MAX_PORTFOLIO } from "./constants";

export type RatingSummary = { avg: number; count: number };

export type Review = {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: number;
  reviewer_name: string;
  job_title: string;
};

export type PublicProfile = {
  id: number;
  name: string;
  role: Role;
  city: string;
  bio: string;
  avatar_id: string | null;
  instagram: string | null;
  facebook: string | null;
  email_verified: number;
  phone_verified: number;
  created_at: string;
  jobs_done: number;
};

export type Photo = { id: string; kind: "avatar" | "portfolio" };

export async function ratingSummaries(userIds: number[]): Promise<Map<number, RatingSummary>> {
  if (userIds.length === 0) return new Map();
  const rows = await all<{ id: number; avg: number; count: number }>(
    `SELECT reviewee_id AS id, AVG(rating) AS avg, COUNT(*) AS count FROM reviews
     WHERE reviewee_id IN (${userIds.map(() => "?").join(",")}) GROUP BY reviewee_id`,
    userIds,
  );
  return new Map(rows.map((r) => [r.id, { avg: r.avg, count: r.count }]));
}

export async function ratingSummary(userId: number): Promise<RatingSummary> {
  return (await ratingSummaries([userId])).get(userId) ?? { avg: 0, count: 0 };
}

export function listReviewsFor(userId: number, limit = 20): Promise<Review[]> {
  return all<Review>(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.reviewer_id, u.name AS reviewer_name, j.title AS job_title
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     JOIN applications a ON a.id = r.application_id
     JOIN jobs j ON j.id = a.job_id
     WHERE r.reviewee_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT ${Math.floor(limit)}`,
    [userId],
  );
}

/** Ulasan yang sudah ditulis user ini untuk sebuah deal (null bila belum). */
export function getMyReview(applicationId: number, reviewerId: number) {
  return get<{ rating: number; comment: string }>(
    "SELECT rating, comment FROM reviews WHERE application_id = ? AND reviewer_id = ?",
    [applicationId, reviewerId],
  );
}

export function getReviewAbout(applicationId: number, revieweeId: number) {
  return get<{ rating: number; comment: string }>(
    "SELECT rating, comment FROM reviews WHERE application_id = ? AND reviewee_id = ?",
    [applicationId, revieweeId],
  );
}

export function getPublicProfile(userId: number): Promise<PublicProfile | null> {
  return get<PublicProfile>(
    `SELECT u.id, u.name, u.role, u.city, u.bio, u.avatar_id, u.instagram, u.facebook, u.created_at,
            u.email_verified_at IS NOT NULL AS email_verified, u.phone_verified_at IS NOT NULL AS phone_verified,
            (SELECT COUNT(*) FROM applications a JOIN jobs j ON j.id = a.job_id
             WHERE a.status = 'diterima' AND j.work_date < date('now')
               AND (a.worker_id = u.id OR j.employer_id = u.id)) AS jobs_done
     FROM users u WHERE u.id = ?`,
    [userId],
  );
}

export function listPhotos(userId: number, kind: "avatar" | "portfolio"): Promise<Photo[]> {
  return all<Photo>("SELECT id, kind FROM photos WHERE user_id = ? AND kind = ? ORDER BY created_at", [userId, kind]);
}

/** Ubah input "@nama", "nama", atau URL profil menjadi username saja. */
export function normalizeHandle(input: string, site: "instagram" | "facebook"): string | null {
  let v = input.trim();
  if (!v) return "";
  v = v.replace(/^https?:\/\//i, "").replace(/^(www\.|m\.)/i, "");
  const host = site === "instagram" ? /^instagram\.com\//i : /^(facebook|fb)\.com\//i;
  v = v.replace(host, "").replace(/^@/, "").split(/[/?#]/)[0];
  const ok = site === "instagram" ? /^[A-Za-z0-9._]{1,30}$/ : /^[A-Za-z0-9.]{3,60}$/;
  return ok.test(v) ? v : null;
}

export const socialUrl = (site: "instagram" | "facebook", handle: string) =>
  site === "instagram" ? `https://instagram.com/${handle}` : `https://facebook.com/${handle}`;
