"use client";

import { useState } from "react";

/** Input kata sandi dengan tombol lihat/sembunyikan agar tidak salah ketik. */
export function PasswordInput({
  id = "password",
  label,
  autoComplete,
  minLength,
}: {
  id?: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name="password"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="input pr-24"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-1 right-1 rounded-lg px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          {show ? "🙈 Tutup" : "👁️ Lihat"}
        </button>
      </div>
    </div>
  );
}
