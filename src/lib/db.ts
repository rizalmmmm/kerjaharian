import "server-only";
import type { Client, InArgs, InStatement } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";
import { normalizePhone } from "./phone";
import dummyData from "./dummy-jobs.json";

/**
 * Database: libSQL/SQLite.
 * - Lokal: file `data/kerjaharian.db` (default).
 * - Produksi (Vercel): Turso, lewat env TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 */
const TURSO_URL = process.env.TURSO_DATABASE_URL?.trim();
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN?.trim();
const DB_URL = TURSO_URL || `file:${path.join(process.cwd(), "data", "kerjaharian.db")}`;

/** Data demo diisi otomatis secara lokal; di Vercel hanya bila SEED_DEMO_DATA=1. */
export const DEMO_ENABLED = process.env.SEED_DEMO_DATA ? process.env.SEED_DEMO_DATA === "1" : !process.env.VERCEL;

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

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (application_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- Foto disimpan sebagai base64 (JPEG kecil hasil kompres di browser) agar tidak butuh layanan storage terpisah.
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('avatar', 'portfolio')),
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photos_user ON photos(user_id, kind);

CREATE TABLE IF NOT EXISTS phone_otps (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
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
async function migrate(db: Client) {
  const cols = (await db.execute("PRAGMA table_info(jobs)")).rows.map((r) => String(r.name));
  if (!cols.includes("lat")) await db.execute("ALTER TABLE jobs ADD COLUMN lat REAL");
  if (!cols.includes("lng")) await db.execute("ALTER TABLE jobs ADD COLUMN lng REAL");
  if (!cols.includes("is_dummy")) await db.execute("ALTER TABLE jobs ADD COLUMN is_dummy INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes("dummy_key")) await db.execute("ALTER TABLE jobs ADD COLUMN dummy_key TEXT");
  const userCols = (await db.execute("PRAGMA table_info(users)")).rows.map((r) => String(r.name));
  if (!userCols.includes("email_verified_at")) await db.execute("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
  if (!userCols.includes("is_dummy"))
    await db.execute("ALTER TABLE users ADD COLUMN is_dummy INTEGER NOT NULL DEFAULT 0");
  for (const col of ["avatar_id", "instagram", "facebook", "phone_verified_at", "phone_norm"]) {
    if (!userCols.includes(col)) await db.execute(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
  }
}

/**
 * Nomor HP dipakai untuk masuk, jadi disimpan juga dalam bentuk baku (628…) dan dibuat unik.
 * Akun lama diisi otomatis; bila ada nomor ganda, hanya akun pertama yang memakainya untuk login.
 */
async function backfillPhoneNorm(db: Client) {
  const rows = (await db.execute("SELECT id, phone FROM users WHERE phone_norm IS NULL ORDER BY id")).rows;
  if (rows.length) {
    const taken = new Set(
      (await db.execute("SELECT phone_norm FROM users WHERE phone_norm IS NOT NULL")).rows.map((r) =>
        String(r.phone_norm),
      ),
    );
    const updates: InStatement[] = [];
    for (const r of rows) {
      const norm = normalizePhone(String(r.phone));
      if (!norm || taken.has(norm)) continue;
      taken.add(norm);
      updates.push({ sql: "UPDATE users SET phone_norm = ? WHERE id = ?", args: [norm, Number(r.id)] });
    }
    if (updates.length) await db.batch(updates, "write");
  }
  await db.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_norm ON users(phone_norm) WHERE phone_norm IS NOT NULL",
  );
}

/**
 * 100 lowongan contoh yang sudah kedaluwarsa (lihat docs/DATA-DUMMY.txt), agar situs tidak tampak kosong.
 * Ditandai is_dummy = 1. Dimasukkan sekali saja (penanda di app_meta), jadi bila dihapus tidak muncul lagi.
 * Akun pemberi kerja contoh tidak punya nomor HP dan tidak bisa dipakai masuk.
 */
async function seedDummyJobs(db: Client) {
  const MARK = `dummy_jobs_v${dummyData.version}`;
  if ((await db.execute({ sql: "SELECT 1 FROM app_meta WHERE key = ?", args: [MARK] })).rows.length) return;

  const stmts: InStatement[] = [
    // Penanda dulu: bila instance lain sudah mengisi, batch ini gagal utuh (PRIMARY KEY bentrok).
    { sql: "INSERT INTO app_meta (key, value) VALUES (?, ?)", args: [MARK, new Date().toISOString()] },
    ...dummyData.employers.map((e) => ({
      sql: `INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, city, bio, is_dummy)
            VALUES (?, ?, '', '!', 'pemberi_kerja', ?, ?, 1)`,
      args: [e.name, e.email, e.city, e.bio],
    })),
    ...dummyData.jobs.map((j) => ({
      sql: `INSERT INTO jobs (employer_id, title, category, description, city, address, wage, wage_unit, work_date,
              start_time, end_time, slots, status, lat, lng, is_dummy, dummy_key)
            VALUES ((SELECT id FROM users WHERE email = ? AND is_dummy = 1), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'tutup', ?, ?, 1, ?)`,
      args: [
        dummyData.employers.find((e) => e.name === j.employer)!.email,
        j.title,
        j.category,
        j.description,
        j.city,
        j.address,
        j.wage,
        j.wage_unit,
        j.work_date,
        j.start_time,
        j.end_time,
        j.slots,
        j.lat,
        j.lng,
        j.key,
      ],
    })),
  ];
  try {
    await db.batch(stmts, "write");
  } catch {
    // Sudah diisi oleh instance lain secara bersamaan — abaikan.
  }
}

const globalForDb = globalThis as unknown as { khDb?: Promise<Client> };

/**
 * File lokal memakai driver native (libsql); Turso memakai klien HTTP murni-JS,
 * yang cocok untuk serverless dan tidak butuh modul native di Vercel.
 */
async function connect(): Promise<Client> {
  if (DB_URL.startsWith("file:")) {
    if (process.env.VERCEL) {
      throw new Error("TURSO_DATABASE_URL belum diset di Vercel (Settings → Environment Variables), lalu Redeploy.");
    }
    fs.mkdirSync(path.dirname(DB_URL.slice(5)), { recursive: true });
    const { createClient } = await import("@libsql/client/sqlite3");
    const db = createClient({ url: DB_URL });
    await db.execute("PRAGMA journal_mode = WAL");
    return db;
  }
  if (!TURSO_TOKEN) throw new Error("TURSO_AUTH_TOKEN belum diset.");
  const { createClient } = await import("@libsql/client/http");
  return createClient({ url: DB_URL, authToken: TURSO_TOKEN });
}

async function open(): Promise<Client> {
  const db = await connect();
  await db.executeMultiple(SCHEMA);
  await migrate(db);
  if (DEMO_ENABLED) await seed(db);
  if (process.env.SEED_DUMMY_JOBS !== "0") await seedDummyJobs(db);
  await backfillPhoneNorm(db);
  return db;
}

async function getDb(): Promise<Client> {
  if (!globalForDb.khDb) {
    globalForDb.khDb = open().catch((err) => {
      globalForDb.khDb = undefined;
      throw err;
    });
  }
  return globalForDb.khDb;
}

/** Cek koneksi database untuk /api/health (pesan error tanpa rahasia). */
export async function checkDb(): Promise<{ ok: boolean; mode: string; error?: string }> {
  const mode = DB_URL.startsWith("file:") ? "file" : "turso";
  try {
    await (await getDb()).execute("SELECT 1");
    return { ok: true, mode };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, mode, error: TURSO_TOKEN ? msg.replaceAll(TURSO_TOKEN, "***") : msg };
  }
}

/** Ubah baris libSQL menjadi objek biasa (aman dikirim ke Client Component). */
function plain<T>(columns: string[], row: ArrayLike<unknown>): T {
  return Object.fromEntries(columns.map((c, i) => [c, row[i]])) as T;
}

export async function all<T>(sql: string, args: InArgs = []): Promise<T[]> {
  const res = await (await getDb()).execute({ sql, args });
  return res.rows.map((r) => plain<T>(res.columns, r));
}

export async function get<T>(sql: string, args: InArgs = []): Promise<T | null> {
  return (await all<T>(sql, args))[0] ?? null;
}

export async function run(sql: string, args: InArgs = []): Promise<{ id: number; changes: number }> {
  const res = await (await getDb()).execute({ sql, args });
  return { id: Number(res.lastInsertRowid ?? 0), changes: res.rowsAffected };
}

/** Jalankan beberapa perintah tulis secara atomik. */
export async function batch(statements: InStatement[]) {
  await (await getDb()).batch(statements, "write");
}

function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function seed(db: Client) {
  const { rows } = await db.execute("SELECT COUNT(*) AS n FROM users");
  if (Number(rows[0].n) > 0) return;

  const pw = hashPassword("demo1234");
  const users: [number, string, string, string, string, string, string][] = [
    [
      1,
      "Toko Sumber Rejeki",
      "toko@demo.id",
      "081234567890",
      "pemberi_kerja",
      "Jakarta Selatan",
      "Toko grosir sembako sejak 2005.",
    ],
    [
      2,
      "Cahaya Event Organizer",
      "event@demo.id",
      "081298765432",
      "pemberi_kerja",
      "Bandung",
      "EO untuk pernikahan dan acara perusahaan.",
    ],
    [
      3,
      "Budi Santoso",
      "budi@demo.id",
      "085712345678",
      "pekerja",
      "Jakarta Selatan",
      "Berpengalaman bongkar muat dan kurir motor.",
    ],
  ];
  const [toko, ev, budi] = [1, 2, 3];
  const coords: Record<string, [number, number]> = {
    "Jakarta Selatan": [-6.2615, 106.7975],
    Bandung: [-6.9147, 107.6098],
  };
  const jobs: [number, string, string, string, string, string, number, string, number, string, string, number][] = [
    [
      toko,
      "Helper Bongkar Muat Barang",
      "Gudang & Logistik",
      "Membantu bongkar muat kiriman beras dan minyak dari truk ke gudang. Wajib sehat dan kuat angkat beban. Makan siang disediakan.",
      "Jakarta Selatan",
      "Jl. Fatmawati No. 12",
      150000,
      "hari",
      1,
      "08:00",
      "16:00",
      4,
    ],
    [
      toko,
      "Penjaga Toko Pengganti",
      "Retail & Toko",
      "Menjaga kasir dan melayani pembeli selama pemilik toko cuti. Bisa menggunakan kalkulator dan jujur.",
      "Jakarta Selatan",
      "Jl. Fatmawati No. 12",
      120000,
      "hari",
      3,
      "07:00",
      "15:00",
      1,
    ],
    [
      ev,
      "Crew Dekorasi Pernikahan",
      "Event",
      "Memasang dekorasi pelaminan, bunga, dan lighting untuk acara resepsi. Pengalaman dekorasi menjadi nilai tambah.",
      "Bandung",
      "Gedung Serbaguna Dago",
      175000,
      "hari",
      2,
      "06:00",
      "18:00",
      6,
    ],
    [
      ev,
      "Pelayan Katering (Waiter)",
      "Event",
      "Melayani tamu undangan di acara resepsi. Berpenampilan rapi, kemeja putih dan celana hitam.",
      "Bandung",
      "Hotel Braga",
      25000,
      "jam",
      2,
      "10:00",
      "15:00",
      10,
    ],
    [
      ev,
      "Tukang Cat Dinding Kantor",
      "Konstruksi & Renovasi",
      "Pengecatan ulang ruang kantor 3 lantai. Alat dan cat disediakan.",
      "Bandung",
      "Jl. Asia Afrika No. 45",
      1200000,
      "proyek",
      5,
      "08:00",
      "17:00",
      2,
    ],
    [
      toko,
      "Kurir Motor Antar Barang",
      "Kurir & Pengiriman",
      "Mengantar pesanan sembako ke pelanggan area Jakarta Selatan. Wajib punya motor dan SIM C. Bensin diganti.",
      "Jakarta Selatan",
      "Jl. Fatmawati No. 12",
      130000,
      "hari",
      1,
      "09:00",
      "17:00",
      2,
    ],
  ];

  const stmts: InStatement[] = [
    ...users.map(([id, name, email, phone, role, city, bio]) => ({
      sql: "INSERT INTO users (id, name, email, phone, password_hash, role, city, bio, email_verified_at, phone_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
      args: [id, name, email, phone, pw, role, city, bio],
    })),
    ...jobs.map((j, i) => ({
      sql: `INSERT INTO jobs
        (id, employer_id, title, category, description, city, address, wage, wage_unit, work_date, start_time, end_time, slots, lat, lng)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        i + 1,
        j[0],
        j[1],
        j[2],
        j[3],
        j[4],
        j[5],
        j[6],
        j[7],
        isoDatePlus(j[8]),
        j[9],
        j[10],
        j[11],
        ...coords[j[4]],
      ],
    })),
    // Contoh "deal": Budi sudah diterima di lowongan bongkar muat, lengkap dengan chat.
    {
      sql: "INSERT INTO applications (id, job_id, worker_id, message, status) VALUES (1, 1, ?, ?, 'diterima')",
      args: [budi, "Saya biasa bongkar muat di pasar, siap datang pagi."],
    },
    {
      sql: "INSERT INTO messages (application_id, sender_id, body) VALUES (1, ?, ?), (1, ?, ?)",
      args: [
        toko,
        "Halo Pak Budi, lamaran diterima. Besok datang jam 08.00 ya.",
        budi,
        "Siap, Pak. Saya berangkat dari Pasar Minggu.",
      ],
    },
    // Pekerjaan yang sudah selesai + ulasan dua arah, agar rating tampil di demo.
    {
      sql: `INSERT INTO jobs (id, employer_id, title, category, description, city, address, wage, wage_unit, work_date, start_time, end_time, slots, status, lat, lng)
            VALUES (100, ?, 'Bantu Pindahan Gudang', 'Gudang & Logistik', 'Memindahkan stok ke gudang baru.', 'Jakarta Selatan', 'Jl. Fatmawati No. 12', 150000, 'hari', ?, '08:00', '16:00', 2, 'tutup', ?, ?)`,
      args: [toko, isoDatePlus(-7), ...coords["Jakarta Selatan"]],
    },
    { sql: "INSERT INTO applications (id, job_id, worker_id, status) VALUES (100, 100, ?, 'diterima')", args: [budi] },
    {
      sql: "INSERT INTO reviews (application_id, reviewer_id, reviewee_id, rating, comment) VALUES (100, ?, ?, 5, ?), (100, ?, ?, 5, ?)",
      args: [
        toko,
        budi,
        "Rajin, datang tepat waktu, kerjanya rapi.",
        budi,
        toko,
        "Bayaran tepat waktu, makan siang disediakan.",
      ],
    },
    { sql: "UPDATE users SET instagram = 'tokosumberrejeki' WHERE id = ?", args: [toko] },
    { sql: "UPDATE users SET instagram = 'cahaya.eo', facebook = 'cahayaeventorganizer' WHERE id = ?", args: [ev] },
  ];
  try {
    await db.batch(stmts, "write");
  } catch {
    // Instance lain sudah mengisi data demo lebih dulu (id bentrok) — abaikan.
  }
}
