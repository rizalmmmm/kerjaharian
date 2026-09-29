import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { login } from "@/lib/actions";
import { DEMO_ENABLED } from "@/lib/db";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage(props: PageProps<"/masuk">) {
  if (await getCurrentUser()) redirect("/dasbor");
  const { next } = await props.searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-extrabold">Masuk</h1>
      <p className="mt-1 text-slate-600">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-brand-700 hover:underline">
          Daftar gratis
        </Link>
      </p>
      <div className="card mt-6 p-6">
        <ActionForm action={login} submitLabel="Masuk" pendingLabel="Masuk…">
          <input type="hidden" name="next" value={typeof next === "string" ? next : ""} />
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Kata sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </div>
        </ActionForm>
      </div>
      {DEMO_ENABLED && (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
          Akun demo (sandi <code>demo1234</code>): <code>toko@demo.id</code>, <code>event@demo.id</code> (pemberi
          kerja), <code>budi@demo.id</code> (pekerja).
        </p>
      )}
    </div>
  );
}
