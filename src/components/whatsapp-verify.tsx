"use client";

import { useActionState } from "react";
import { confirmPhoneOtp, requestPhoneOtp, type FormState } from "@/lib/actions";

/** Kartu verifikasi nomor WhatsApp via kode OTP 6 digit. */
export function WhatsAppVerify({ phone, codeSentTo }: { phone: string; codeSentTo: string | null }) {
  const [sendState, sendAction, sending] = useActionState<FormState, FormData>(requestPhoneOtp, undefined);
  const [checkState, checkAction, checking] = useActionState<FormState, FormData>(confirmPhoneOtp, undefined);
  const awaitingCode = Boolean(codeSentTo) || Boolean(sendState?.ok);

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <p className="font-semibold text-green-900">Verifikasi nomor WhatsApp</p>
      <p className="mt-1 text-sm text-green-800">
        Kami kirim kode 6 digit ke WhatsApp <strong>{phone}</strong>. Nomor terverifikasi membuat pemberi kerja & pekerja
        lebih percaya.
      </p>

      {awaitingCode && (
        <form action={checkAction} className="mt-3 flex max-w-sm gap-2">
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="Kode 6 digit"
            aria-label="Kode verifikasi"
            className="input tracking-[0.4em]"
          />
          <button className="btn-primary shrink-0" disabled={checking}>
            {checking ? "Memeriksa…" : "Verifikasi"}
          </button>
        </form>
      )}

      <form action={sendAction} className="mt-2">
        <button
          className={awaitingCode ? "text-sm font-semibold text-green-800 hover:underline" : "btn-primary mt-1"}
          disabled={sending}
        >
          {sending ? "Mengirim…" : awaitingCode ? "Kirim ulang kode" : "Kirim kode ke WhatsApp"}
        </button>
      </form>

      {[sendState, checkState].map((s, i) =>
        s?.error ? (
          <p key={i} className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {s.error}
          </p>
        ) : s?.ok ? (
          <p key={i} className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-green-800" role="status">
            {s.ok}
          </p>
        ) : null,
      )}
    </div>
  );
}
