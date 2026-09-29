# Panduan deploy: Vercel + Turso + domain Domainesia

Tiga bagian, total kira-kira 20–30 menit:

1. **Turso**: database (gratis).
2. **Vercel**: menjalankan aplikasi (gratis, paket Hobby).
3. **Domainesia**: mengarahkan `kerja-harian.id` ke Vercel.

---

## 1. Buat database di Turso

1. Daftar di <https://turso.tech> (bisa login pakai akun GitHub).
2. Di dashboard Turso klik **Create Database**:
   - Nama: `kerjaharian`
   - Lokasi/region: pilih **AWS AP NorthEast (Tokyo)** (Singapore tidak tersedia).
3. Buka database tersebut, lalu salin dua nilai:
   - **Database URL**: bentuknya `libsql://kerjaharian-xxxx.turso.io`
   - **Token**: klik **Create Token** / **Generate Token** (akses *read & write*, tanpa kedaluwarsa).

> Alternatif lewat terminal (jika memakai Turso CLI):
> ```bash
> turso db create kerjaharian --location aws-ap-northeast-1
> turso db show kerjaharian --url
> turso db tokens create kerjaharian
> ```

Tabel dibuat **otomatis** oleh aplikasi saat pertama kali dijalankan, jadi tidak perlu menjalankan SQL apa pun.

## 2. Deploy ke Vercel

1. Pastikan kode sudah ada di GitHub (repo `rizalmmmm/kerjaharian`). Jika memakai branch
   `claude/kerja-harian-web-version-3okugp`, gabungkan (merge) dulu ke `main` supaya Vercel memakai
   branch utama untuk produksi.
2. Daftar/login di <https://vercel.com> pakai akun GitHub.
3. Klik **Add New… → Project**, pilih repo **kerjaharian**, klik **Import**.
4. Framework otomatis terdeteksi sebagai **Next.js**. Biarkan build command bawaan.
5. Buka bagian **Environment Variables**, tambahkan:

   | Name                 | Value                                   |
   | -------------------- | --------------------------------------- |
   | `TURSO_DATABASE_URL` | URL dari langkah 1 (`libsql://…`)       |
   | `TURSO_AUTH_TOKEN`   | Token dari langkah 1                    |
   | `SEED_DEMO_DATA`     | *(opsional)* `1` untuk mengisi data demo |

   > Di produksi sebaiknya **jangan** isi `SEED_DEMO_DATA`, karena akun demo memakai kata sandi
   > publik `demo1234`. Aktifkan hanya untuk uji coba, lalu hapus variabelnya.

6. Klik **Deploy**. Setelah selesai, situs bisa dibuka di alamat `kerjaharian-xxxx.vercel.app`.
7. **Settings → Functions → Function Region**: pilih **Tokyo (hnd1)** agar dekat dengan database
   dan pengguna di Indonesia.

Setiap `git push` ke `main` otomatis akan di-deploy ulang.

## 3. Hubungkan domain kerja-harian.id (Domainesia)

### Di Vercel

1. Buka project → **Settings → Domains**.
2. Tambahkan `kerja-harian.id`, lalu tambahkan juga `www.kerja-harian.id`
   (pilih opsi redirect `www` → `kerja-harian.id`).
3. Vercel akan menampilkan **record DNS** yang harus dipasang. Biasanya:

   | Type  | Name / Host | Value                  |
   | ----- | ----------- | ---------------------- |
   | A     | `@`         | `76.76.21.21`          |
   | CNAME | `www`       | `cname.vercel-dns.com` |

   Jika nilai yang ditampilkan Vercel berbeda, **ikuti yang ditampilkan Vercel**.

### Di Domainesia

1. Login ke member area <https://my.domainesia.com>.
2. Buka **Domain → kerja-harian.id → Kelola / Manage**.
3. Pastikan **Nameserver** memakai DNS Domainesia (bawaan), lalu buka menu **DNS Management / Kelola DNS**.
4. Hapus record `A` untuk `@` dan record `www` yang lama (bawaan parkir/hosting) jika ada.
5. Tambahkan record sesuai tabel dari Vercel di atas, lalu simpan.
6. Tunggu propagasi DNS (biasanya beberapa menit, maksimal 24–48 jam). Status di Vercel → Domains
   akan berubah menjadi **Valid Configuration**, dan sertifikat **HTTPS** dibuat otomatis.

> HTTPS **wajib** agar fitur GPS (lacak lokasi) berfungsi di browser, dan Vercel sudah
> menyediakannya otomatis.

## Pengembangan lokal

Tanpa variabel Turso, aplikasi memakai file lokal `data/kerjaharian.db`, jadi cukup:

```bash
npm install
npm run dev
```

Untuk menguji lokal dengan database Turso, salin `.env.example` ke `.env.local` dan isi nilainya.

## Masalah umum

| Gejala | Solusi |
| ------ | ------ |
| Cek cepat koneksi database | Buka `https://<domain-anda>/api/health`. Hasil `"status":"ok"` berarti database terhubung; jika `"error"`, pesannya menjelaskan penyebabnya. |
| Halaman error 500 setelah deploy | Periksa `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` di Vercel → Settings → Environment Variables, lalu **Redeploy**. Log ada di Vercel → Deployments → Functions/Logs. |
| Domain "Invalid Configuration" | Cek ulang record DNS di Domainesia, tunggu propagasi. Cek dengan <https://dnschecker.org>. |
| Tombol "Bagikan lokasi" gagal | Pastikan membuka situs lewat `https://` dan izin lokasi browser diizinkan. |
| Beranda kosong | Wajar untuk database baru; daftar sebagai pemberi kerja dan pasang lowongan pertama. |
