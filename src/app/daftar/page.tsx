import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Field } from "@/components/field";
import { ActionForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { register } from "@/lib/actions";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage(props: PageProps<"/daftar">) {
  if (await getCurrentUser()) redirect("/dasbor");
  const { peran, next } = await props.searchParams;
  const role = peran === "pemberi_kerja" ? "pemberi_kerja" : "pekerja";

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-extrabold">Buat akun</h1>
      <p className="mt-1 text-slate-600">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-brand-700 hover:underline">
          Masuk
        </Link>
      </p>
      <div className="card mt-6 p-6">
        <ActionForm action={register} submitLabel="Daftar" pendingLabel="Mendaftarkan…">
          <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
          <fieldset>
            <legend className="label">Saya ingin…</legend>
            <div className="grid grid-cols-2 gap-2">
              <RoleOption value="pekerja" title="Cari kerja" desc="Saya pekerja" defaultChecked={role === "pekerja"} />
              <RoleOption
                value="pemberi_kerja"
                title="Cari pekerja"
                desc="Saya pemberi kerja"
                defaultChecked={role === "pemberi_kerja"}
              />
            </div>
          </fieldset>
          <Field label="Nama lengkap / nama usaha" name="name" autoComplete="name" required />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Nomor HP / WhatsApp" name="phone" type="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" required />
          <Field label="Kota" name="city" placeholder="mis. Jakarta Selatan" />
          <Field
            label="Kata sandi (min. 8 karakter)"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </ActionForm>
      </div>
    </div>
  );
}

function RoleOption({ value, title, desc, defaultChecked }: { value: string; title: string; desc: string; defaultChecked: boolean }) {
  return (
    <label className="cursor-pointer rounded-lg border border-slate-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
      <input type="radio" name="role" value={value} defaultChecked={defaultChecked} className="sr-only" />
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-slate-500">{desc}</div>
    </label>
  );
}
