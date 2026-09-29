import "server-only";
import { all, get } from "./db";
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

export function listOpenJobs(filter: JobFilter = {}, limit = 50): Promise<Job[]> {
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
  return all<Job>(
    `${JOB_SELECT} WHERE ${where.join(" AND ")} ORDER BY j.work_date ASC, j.id DESC LIMIT ${Math.floor(limit)}`,
    args,
  );
}

export function getJob(id: number): Promise<Job | null> {
  return get<Job>(`${JOB_SELECT} WHERE j.id = ?`, [id]);
}

export function listJobsByEmployer(employerId: number): Promise<Job[]> {
  return all<Job>(`${JOB_SELECT} WHERE j.employer_id = ? ORDER BY j.created_at DESC, j.id DESC`, [employerId]);
}

export async function listCities(): Promise<string[]> {
  const rows = await all<{ city: string }>("SELECT DISTINCT city FROM jobs WHERE status = 'buka' ORDER BY city");
  return rows.map((r) => r.city);
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

export function listApplicants(jobId: number): Promise<Applicant[]> {
  return all<Applicant>(
    `SELECT a.id, a.worker_id, u.name, u.phone, u.city, u.bio, a.message, a.status, a.created_at
     FROM applications a JOIN users u ON u.id = a.worker_id
     WHERE a.job_id = ? ORDER BY a.created_at ASC, a.id ASC`,
    [jobId],
  );
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

export function listApplicationsByWorker(workerId: number): Promise<MyApplication[]> {
  return all<MyApplication>(
    `SELECT a.id, a.status, a.created_at, j.id AS job_id, j.title, j.city, j.wage, j.wage_unit, j.work_date,
            u.name AS employer_name, u.phone AS employer_phone
     FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = j.employer_id
     WHERE a.worker_id = ? ORDER BY a.created_at DESC, a.id DESC`,
    [workerId],
  );
}

export function getApplication(
  jobId: number,
  workerId: number,
): Promise<{ id: number; status: ApplicationStatus } | null> {
  return get("SELECT id, status FROM applications WHERE job_id = ? AND worker_id = ?", [jobId, workerId]);
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
export function listDealsForEmployer(employerId: number): Promise<EmployerDeal[]> {
  return all<EmployerDeal>(
    `SELECT a.id, a.status, j.id AS job_id, j.title, j.work_date, u.name AS worker_name
     FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.worker_id
     WHERE j.employer_id = ? AND a.status != 'ditolak'
     ORDER BY (a.status = 'diterima') DESC, j.work_date ASC, a.id DESC`,
    [employerId],
  );
}

export async function getStats() {
  const row = await get<{ openJobs: number; workers: number; employers: number }>(
    `SELECT
       (SELECT COUNT(*) FROM jobs WHERE status = 'buka' AND work_date >= date('now')) AS openJobs,
       (SELECT COUNT(*) FROM users WHERE role = 'pekerja') AS workers,
       (SELECT COUNT(*) FROM users WHERE role = 'pemberi_kerja') AS employers`,
  );
  return row ?? { openJobs: 0, workers: 0, employers: 0 };
}
