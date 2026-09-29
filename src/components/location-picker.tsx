"use client";

import { useState } from "react";
import { MapView } from "./map";

/** Pilih titik lokasi kerja di peta; nilainya dikirim lewat input tersembunyi `lat`/`lng`. */
export function LocationPicker() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");

  function locateMe() {
    if (!navigator.geolocation) return setError("Browser tidak mendukung GPS.");
    setError("");
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("Tidak bisa mengambil lokasi. Pastikan izin lokasi diaktifkan."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="label mb-0">Titik lokasi kerja (opsional)</span>
        <button type="button" onClick={locateMe} className="text-sm font-semibold text-brand-700 hover:underline">
          📍 Gunakan lokasi saya
        </button>
      </div>
      <MapView
        className="h-64"
        points={pos ? [{ id: "job", ...pos, label: "Lokasi kerja", emoji: "📍", color: "#059669" }] : []}
        onPick={(lat, lng) => setPos({ lat, lng })}
      />
      <p className="mt-1 text-xs text-slate-500">
        {pos
          ? `Terpilih: ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} — klik peta untuk memindahkan.`
          : "Klik peta untuk menandai lokasi. Titik ini ditampilkan ke pekerja setelah deal."}
        {pos && (
          <button type="button" onClick={() => setPos(null)} className="ml-2 text-red-600 hover:underline">
            Hapus
          </button>
        )}
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <input type="hidden" name="lat" value={pos?.lat ?? ""} />
      <input type="hidden" name="lng" value={pos?.lng ?? ""} />
    </div>
  );
}
