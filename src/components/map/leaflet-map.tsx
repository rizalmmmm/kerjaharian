"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  emoji: string;
  color: string;
  accuracy?: number;
};

const JAKARTA: [number, number] = [-6.2, 106.816666];

function pinIcon(emoji: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:grid;place-items:center;width:36px;height:36px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);font-size:18px">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/** Sesuaikan zoom agar semua titik terlihat, hanya saat jumlah titik berubah. */
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((p) => p.id).join(",");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 15);
    else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function LeafletMap({
  points,
  line,
  onPick,
  className = "h-80",
}: {
  points: MapPoint[];
  /** Garis putus-putus antar dua titik (mis. pekerja → lokasi kerja). */
  line?: [number, number][];
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}) {
  const center: [number, number] = points[0] ? [points[0].lat, points[0].lng] : JAKARTA;
  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom className={`z-0 w-full rounded-xl ${className}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {onPick && <ClickHandler onPick={onPick} />}
      {line && line.length === 2 && <Polyline positions={line} pathOptions={{ color: "#059669", dashArray: "6 8" }} />}
      {points.map((p) => (
        <div key={p.id}>
          {!!p.accuracy && p.accuracy > 20 && (
            <Circle center={[p.lat, p.lng]} radius={p.accuracy} pathOptions={{ color: p.color, weight: 1, fillOpacity: 0.1 }} />
          )}
          <Marker position={[p.lat, p.lng]} icon={pinIcon(p.emoji, p.color)}>
            <Popup>{p.label}</Popup>
          </Marker>
        </div>
      ))}
    </MapContainer>
  );
}
