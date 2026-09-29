import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-slate-600">Lowongan mungkin sudah dihapus atau tautan salah.</p>
      <Link href="/lowongan" className="btn-primary mt-6">
        Lihat lowongan lain
      </Link>
    </div>
  );
}
