import type { Metadata } from "next";
import { Field } from "@/components/field";
import { ActionForm } from "@/components/forms";
import { LocationPicker } from "@/components/location-picker";
import { requireUser } from "@/lib/auth";
import { createJob } from "@/lib/actions";
import { CATEGORIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Pasang Lowongan" };

export default async function NewJobPage() {
  const user = await requireUser("pemberi_kerja");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-extrabold">Pasang lowongan kerja harian</h1>
      <p className="mt-1 text-slate-600">Gratis. Lowongan langsung tampil untuk pekerja di kota Anda.</p>

      <div className="card mt-6 p-6">
        <ActionForm action={createJob} submitLabel="Terbitkan lowongan" pendingLabel="Menerbitkan…">
          <Field label="Judul pekerjaan" name="title" placeholder="mis. Helper bongkar muat" required />
          <div>
            <label htmlFor="category" className="label">
              Kategori
            </label>
            <select id="category" name="category" required className="input" defaultValue="">
              <option value="" disabled>
                Pilih kategori
              </option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="description" className="label">
              Deskripsi & persyaratan
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              required
              className="input"
              placeholder="Tugas, persyaratan, fasilitas (makan, transport), dll."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kota" name="city" defaultValue={user.city} required />
            <Field label="Alamat / lokasi (opsional)" name="address" />
          </div>
          <LocationPicker />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Upah (Rp)" name="wage" type="number" min={1000} step={1000} required />
            <div>
              <label htmlFor="wage_unit" className="label">
                Satuan upah
              </label>
              <select id="wage_unit" name="wage_unit" className="input" defaultValue="hari">
                <option value="hari">Per hari</option>
                <option value="jam">Per jam</option>
                <option value="proyek">Per proyek</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tanggal kerja" name="work_date" type="date" min={today} defaultValue={today} required />
            <Field label="Jam mulai" name="start_time" type="time" defaultValue="08:00" />
            <Field label="Jam selesai" name="end_time" type="time" defaultValue="17:00" />
          </div>
          <Field label="Jumlah pekerja dibutuhkan" name="slots" type="number" min={1} max={500} defaultValue="1" required />
        </ActionForm>
      </div>
    </div>
  );
}
