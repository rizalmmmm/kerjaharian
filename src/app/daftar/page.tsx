import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Field } from "@/components/field";
import { ActionForm } from "@/components/forms";
import { PasswordInput } from "@/components/password-input";
import { getCurrentUser } from "@/lib/auth";
import { register } from "@/lib/actions";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage(props: PageProps<"/daftar">) {
  if (await getCurrentUser()) redirect("/dasbor");
  const { peran, next } = await props.searchParams;
  const role = peran === "pemberi_kerja" ? "pemberi_kerja" : "pekerja";

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-3xl font-extrabold">Daftar gratis ✍️</h1>
      <p className="mt-1 text-lg text-slate-600">Cukup nama dan nomor HP.</p>
      <div className="card mt-6 p-5">
        <ActionForm
          action={register}
          submitLabel="✅ Daftar Sekarang"
          pendingLabel="Mendaftarkan…"
          submitClassName="btn-big btn-primary"
          className="grid gap-5"
        >
          <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
          <fieldset>
            <legend className="label">Saya mau…</legend>
            <div className="grid grid-cols-2 gap-3">
              <RoleOption value="pekerja" icon="🔍" title="Cari Kerja" defaultChecked={role === "pekerja"} />
              <RoleOption value="pemberi_kerja" icon="🧑‍🔧" title="Cari Pekerja" defaultChecked={role === "pemberi_kerja"} />
            </div>
          </fieldset>
          <Field label="Nama" name="name" autoComplete="name" placeholder="Nama Anda / nama usaha" required />
          <Field
            label="Nomor HP / WhatsApp"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08xxxxxxxxxx"
            required
          />
          <PasswordInput label="Buat kata sandi (min. 6)" autoComplete="new-password" minLength={6} />
          <Field label="Desa / Kota (boleh kosong)" name="city" placeholder="mis. Sleman" />
          <details className="rounded-xl bg-slate-50 p-3">
            <summary className="cursor-pointer font-semibold text-slate-700">📧 Punya email? (tidak wajib)</summary>
            <div className="mt-3">
              <Field label="Email" name="email" type="email" autoComplete="email" placeholder="nama@email.com" />
            </div>
          </details>
        </ActionForm>
      </div>
      <p className="mt-6 text-center text-lg">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-bold text-brand-700 underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}

function RoleOption({
  value,
  icon,
  title,
  defaultChecked,
}: {
  value: string;
  icon: string;
  title: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 border-slate-200 p-4 text-center transition has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:shadow-md">
      <input type="radio" name="role" value={value} defaultChecked={defaultChecked} className="sr-only" />
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-lg font-bold">{title}</span>
    </label>
  );
}
