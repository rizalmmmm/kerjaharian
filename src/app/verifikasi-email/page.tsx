import type { Metadata } from "next";
import Link from "next/link";
import { consumeVerificationToken } from "@/lib/verification";

export const metadata: Metadata = { title: "Verifikasi Email" };

export default async function VerifyEmailPage(props: PageProps<"/verifikasi-email">) {
  const { token } = await props.searchParams;
  const userId = typeof token === "string" ? await consumeVerificationToken(token) : null;

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      {userId ? (
        <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-3xl">✅</div>
          <h1 className="mt-4 text-2xl font-extrabold">Email terverifikasi!</h1>
          <p className="mt-2 text-slate-600">Akun Anda kini memiliki lencana terverifikasi.</p>
          <Link href="/dasbor" className="btn-primary mt-6">
            Ke dasbor
          </Link>
        </>
      ) : (
        <>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-100 text-3xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-extrabold">Tautan tidak valid</h1>
          <p className="mt-2 text-slate-600">
            Tautan sudah kedaluwarsa atau sudah dipakai. Masuk ke dasbor lalu klik &quot;Kirim ulang email
            verifikasi&quot;.
          </p>
          <Link href="/dasbor" className="btn-primary mt-6">
            Ke dasbor
          </Link>
        </>
      )}
    </div>
  );
}
