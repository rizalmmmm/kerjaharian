import "server-only";
import { getDb } from "./db";
import type { ApplicationStatus, WageUnit } from "./constants";

export type Job = {
  id: number;
  employer_id: number;
  employer_name: string;
  title: string;
  category: string;
  description: string;
  city: string;
  address: string;
  wage: number;
  wage_unit: WageUnit;
  work_date: string;
  start_time: string;
  end_time: string;
  slots: number;
  status: "buka" | "tutup";
  created_at: string;
  lat: number | null;
  lng: number | null;
  accepted_count: number;
  applicant_count: number;
};

const JOB_SELECT = `
  SELECT j.*, u.name AS employer_name,
    (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'diterima') AS accepted_count,
    (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
  FROM jobs j JOIN users u ON u.id = j.employer_id`;

export type JobFilter = { q?: string; category?: string; city?: string };

export function listOpenJobs(filter: JobFilter = {}, limit = 50): Job[] {
  const where = ["j.status = 'buka'", "j.work_date >= date('now')"];
  const args: string[] = [];
  if (filter.q) {
    where.push("(j.title LIKE ? OR j.description LIKE ?)");
    args.push(`%${filter.q}%`, `%${filter.q}%`);
  }
  if (filter.category) {
    where.push("j.category = ?");
    args.push(filter.category);
  }
  if (filter.city) {
    where.push("j.city LIKE ?");
    args.push(`%${filter.city}%`);
  }
  return getDb()
    .prepare(`${JOB_SELECT} WHERE ${where.join(" AND ")} ORDER BY j.work_date ASC, j.id DESC LIMIT ${limit}`)
    .all(...args) as Job[];
}

export function getJob(id: number): Job | null {
  return (getDb().prepare(`${JOB_SELECT} WHERE j.id = ?`).get(id) as Job | undefined) ?? null;
}

export function listJobsByEmployer(employerId: number): Job[] {
  return getDb()
    .prepare(`${JOB_SELECT} WHERE j.employer_id = ? ORDER BY j.created_at DESC, j.id DESC`)
    .all(employerId) as Job[];
}

export function listCities(): string[] {
  return (
    getDb()
      .prepare("SELECT DISTINCT city FROM jobs WHERE status = 'buka' ORDER BY city")
      .all() as { city: string }[]
  ).map((r) => r.city);
}

export type Applicant = {
  id: number;
  worker_id: number;
  name: string;
  phone: string;
  city: string;
  bio: string;
  message: string;
  status: ApplicationStatus;
  created_at: string;
};

export function listApplicants(jobId: number): Applicant[] {
  return getDb()
    .prepare(
      `SELECT a.id, a.worker_id, u.name, u.phone, u.city, u.bio, a.message, a.status, a.created_at
       FROM applications a JOIN users u ON u.id = a.worker_id
       WHERE a.job_id = ? ORDER BY a.created_at ASC, a.id ASC`,
    )
    .all(jobId) as Applicant[];
}

export type MyApplication = {
  id: number;
  status: ApplicationStatus;
  created_at: string;
  job_id: number;
  title: string;
  city: string;
  wage: number;
  wage_unit: WageUnit;
  work_date: string;
  employer_name: string;
  employer_phone: string;
};

export function listApplicationsByWorker(workerId: number): MyApplication[] {
  return getDb()
    .prepare(
      `SELECT a.id, a.status, a.created_at, j.id AS job_id, j.title, j.city, j.wage, j.wage_unit, j.work_date,
              u.name AS employer_name, u.phone AS employer_phone
       FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = j.employer_id
       WHERE a.worker_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    )
    .all(workerId) as MyApplication[];
}

export function getApplication(jobId: number, workerId: number): { id: number; status: ApplicationStatus } | null {
  return (
    (getDb()
      .prepare("SELECT id, status FROM applications WHERE job_id = ? AND worker_id = ?")
      .get(jobId, workerId) as { id: number; status: ApplicationStatus } | undefined) ?? null
  );
}

export type EmployerDeal = {
  id: number;
  status: ApplicationStatus;
  job_id: number;
  title: string;
  work_date: string;
  worker_name: string;
};

/** Lamaran aktif (belum ditolak) di semua lowongan milik pemberi kerja. */
export function listDealsForEmployer(employerId: number): EmployerDeal[] {
  return getDb()
    .prepare(
      `SELECT a.id, a.status, j.id AS job_id, j.title, j.work_date, u.name AS worker_name
       FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.worker_id
       WHERE j.employer_id = ? AND a.status != 'ditolak'
       ORDER BY (a.status = 'diterima') DESC, j.work_date ASC, a.id DESC`,
    )
    .all(employerId) as EmployerDeal[];
}

export function getStats() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    openJobs: one("SELECT COUNT(*) AS n FROM jobs WHERE status = 'buka' AND work_date >= date('now')"),
    workers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'pekerja'"),
    employers: one("SELECT COUNT(*) AS n FROM users WHERE role = 'pemberi_kerja'"),
  };
}
