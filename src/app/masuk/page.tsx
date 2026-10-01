import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Field } from "@/components/field";
import { ActionForm } from "@/components/forms";
import { PasswordInput } from "@/components/password-input";
import { getCurrentUser } from "@/lib/auth";
import { login } from "@/lib/actions";
import { DEMO_ENABLED } from "@/lib/db";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage(props: PageProps<"/masuk">) {
  if (await getCurrentUser()) redirect("/dasbor");
  const { next } = await props.searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-3xl font-extrabold">Masuk 🔑</h1>
      <p className="mt-1 text-lg text-slate-600">Pakai nomor HP yang Anda daftarkan.</p>
      <div className="card mt-6 p-5">
        <ActionForm
          action={login}
          submitLabel="Masuk"
          pendingLabel="Masuk…"
          submitClassName="btn-big btn-primary"
          className="grid gap-5"
        >
          <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
          <Field
            label="Nomor HP / WhatsApp"
            name="login"
            inputMode="tel"
            autoComplete="username"
            placeholder="08xxxxxxxxxx"
            required
          />
          <PasswordInput label="Kata sandi" autoComplete="current-password" />
          <p className="-mt-2 text-sm text-slate-500">Dulu daftar pakai email? Ketik email Anda di kolom nomor HP.</p>
        </ActionForm>
      </div>
      <p className="mt-6 text-center text-lg">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-bold text-brand-700 underline">
          Daftar gratis
        </Link>
      </p>
      {DEMO_ENABLED && (
        <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
          Akun demo (sandi <code>demo1234</code>): <code>081234567890</code> (pemberi kerja), <code>085712345678</code>{" "}
          (pekerja).
        </p>
      )}
    </div>
  );
}
