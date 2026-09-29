"use client";
/* eslint-disable @next/next/no-img-element -- pratinjau foto dari /api/foto */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_PORTFOLIO } from "@/lib/constants";

/** Perkecil & kompres foto di browser agar hemat kuota (hasil JPEG ±50–150 KB). */
async function compress(file: File, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal memproses foto"))), "image/jpeg", 0.82),
  );
}

export function PhotoManager({
  name,
  avatarId,
  portfolio,
}: {
  name: string;
  avatarId: string | null;
  portfolio: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const portfolioInput = useRef<HTMLInputElement>(null);

  async function upload(kind: "avatar" | "portfolio", file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Pilih file gambar.");
    setError("");
    setBusy(kind);
    try {
      const blob = await compress(file, kind === "avatar" ? 400 : 1200);
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", new File([blob], "foto.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/foto", { method: "POST", body: fd });
      if (!res.ok) setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Gagal mengunggah.");
      else router.refresh();
    } catch {
      setError("Foto tidak bisa diproses. Coba foto lain.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/foto/${id}`, { method: "DELETE" }).catch(() => {});
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        {avatarId ? (
          <img src={`/api/foto/${avatarId}`} alt={name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-2xl">👤</span>
        )}
        <div className="flex flex-col items-start gap-1">
          <button type="button" className="btn-outline" disabled={!!busy} onClick={() => avatarInput.current?.click()}>
            {busy === "avatar" ? "Mengunggah…" : avatarId ? "Ganti foto profil" : "Unggah foto profil"}
          </button>
          {avatarId && (
            <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => remove(avatarId)}>
              Hapus foto profil
            </button>
          )}
        </div>
        <input
          ref={avatarInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            upload("avatar", e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div>
        <p className="label">Foto portofolio / hasil kerja ({portfolio.length}/{MAX_PORTFOLIO})</p>
        <div className="grid grid-cols-3 gap-2">
          {portfolio.map((id) => (
            <div key={id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              <img src={`/api/foto/${id}`} alt="Portofolio" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={!!busy}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-sm text-white hover:bg-red-600"
                aria-label="Hapus foto"
              >
                ×
              </button>
            </div>
          ))}
          {portfolio.length < MAX_PORTFOLIO && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => portfolioInput.current?.click()}
              className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-700"
            >
              {busy === "portfolio" ? "Mengunggah…" : "+ Tambah"}
            </button>
          )}
        </div>
        <input
          ref={portfolioInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            upload("portfolio", e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
