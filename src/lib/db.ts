import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "kerjaharian.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('pekerja', 'pemberi_kerja')),
  city TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  wage INTEGER NOT NULL,
  wage_unit TEXT NOT NULL CHECK (wage_unit IN ('hari', 'jam', 'proyek')),
  work_date TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  slots INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'tutup')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, work_date);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'diterima', 'ditolak')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (job_id, worker_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_app ON messages(application_id, id);

CREATE TABLE IF NOT EXISTS message_reads (
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (application_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_locations (
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (application_id, user_id)
);
`;

/** Kolom yang ditambahkan setelah rilis awal, untuk database yang sudah ada. */
function migrate(db: DatabaseSync) {
  const cols = (db.prepare("PRAGMA table_info(jobs)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("lat")) db.exec("ALTER TABLE jobs ADD COLUMN lat REAL");
  if (!cols.includes("lng")) db.exec("ALTER TABLE jobs ADD COLUMN lng REAL");
}

const globalForDb = globalThis as unknown as { khDb?: DatabaseSync };

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  migrate(db);
  seed(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.khDb) globalForDb.khDb = open();
  return globalForDb.khDb;
}

function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seed(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (row.n > 0) return;

  const pw = hashPassword("demo1234");
  const insertUser = db.prepare(
    "INSERT INTO users (name, email, phone, password_hash, role, city, bio) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const toko = insertUser.run(
    "Toko Sumber Rejeki",
    "toko@demo.id",
    "081234567890",
    pw,
    "pemberi_kerja",
    "Jakarta Selatan",
    "Toko grosir sembako sejak 2005.",
  ).lastInsertRowid;
  const ev = insertUser.run(
    "Cahaya Event Organizer",
    "event@demo.id",
    "081298765432",
    pw,
    "pemberi_kerja",
    "Bandung",
    "EO untuk pernikahan dan acara perusahaan.",
  ).lastInsertRowid;
  const budi = insertUser.run(
    "Budi Santoso",
    "budi@demo.id",
    "085712345678",
    pw,
    "pekerja",
    "Jakarta Selatan",
    "Berpengalaman bongkar muat dan kurir motor.",
  ).lastInsertRowid;

  const insertJob = db.prepare(`INSERT INTO jobs
    (employer_id, title, category, description, city, address, wage, wage_unit, work_date, start_time, end_time, slots, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const coords: Record<string, [number, number]> = {
    "Jakarta Selatan": [-6.2615, 106.7975],
    Bandung: [-6.9147, 107.6098],
  };
  const jobs: [number | bigint, string, string, string, string, string, number, string, number, string, string, number][] = [
    [toko, "Helper Bongkar Muat Barang", "Gudang & Logistik", "Membantu bongkar muat kiriman beras dan minyak dari truk ke gudang. Wajib sehat dan kuat angkat beban. Makan siang disediakan.", "Jakarta Selatan", "Jl. Fatmawati No. 12", 150000, "hari", 1, "08:00", "16:00", 4],
    [toko, "Penjaga Toko Pengganti", "Retail & Toko", "Menjaga kasir dan melayani pembeli selama pemilik toko cuti. Bisa menggunakan kalkulator dan jujur.", "Jakarta Selatan", "Jl. Fatmawati No. 12", 120000, "hari", 3, "07:00", "15:00", 1],
    [ev, "Crew Dekorasi Pernikahan", "Event", "Memasang dekorasi pelaminan, bunga, dan lighting untuk acara resepsi. Pengalaman dekorasi menjadi nilai tambah.", "Bandung", "Gedung Serbaguna Dago", 175000, "hari", 2, "06:00", "18:00", 6],
    [ev, "Pelayan Katering (Waiter)", "Event", "Melayani tamu undangan di acara resepsi. Berpenampilan rapi, kemeja putih dan celana hitam.", "Bandung", "Hotel Braga", 25000, "jam", 2, "10:00", "15:00", 10],
    [ev, "Tukang Cat Dinding Kantor", "Konstruksi & Renovasi", "Pengecatan ulang ruang kantor 3 lantai. Alat dan cat disediakan.", "Bandung", "Jl. Asia Afrika No. 45", 1200000, "proyek", 5, "08:00", "17:00", 2],
    [toko, "Kurir Motor Antar Barang", "Kurir & Pengiriman", "Mengantar pesanan sembako ke pelanggan area Jakarta Selatan. Wajib punya motor dan SIM C. Bensin diganti.", "Jakarta Selatan", "Jl. Fatmawati No. 12", 130000, "hari", 1, "09:00", "17:00", 2],
  ];
  const jobIds = jobs.map((j) => {
    const [lat, lng] = coords[j[4]];
    return insertJob.run(j[0], j[1], j[2], j[3], j[4], j[5], j[6], j[7], isoDatePlus(j[8]), j[9], j[10], j[11], lat, lng)
      .lastInsertRowid;
  });

  // Contoh "deal": Budi sudah diterima di lowongan bongkar muat, lengkap dengan chat.
  const deal = db
    .prepare("INSERT INTO applications (job_id, worker_id, message, status) VALUES (?, ?, ?, 'diterima')")
    .run(jobIds[0], budi, "Saya biasa bongkar muat di pasar, siap datang pagi.").lastInsertRowid;
  const insertMsg = db.prepare("INSERT INTO messages (application_id, sender_id, body) VALUES (?, ?, ?)");
  insertMsg.run(deal, toko, "Halo Pak Budi, lamaran diterima. Besok datang jam 08.00 ya.");
  insertMsg.run(deal, budi, "Siap, Pak. Saya berangkat dari Pasar Minggu.");
}
