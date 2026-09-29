"use client";

import dynamic from "next/dynamic";

/** Leaflet butuh `window`, jadi peta hanya dirender di browser. */
export const MapView = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="grid h-80 w-full place-items-center rounded-xl bg-slate-100 text-sm text-slate-500">Memuat peta…</div>,
});

export type { MapPoint } from "./leaflet-map";

/** Jarak garis lurus dalam km (rumus haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
