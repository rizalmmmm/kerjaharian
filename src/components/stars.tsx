export function Stars({ value, className = "text-amber-400" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={className} aria-label={`${value.toFixed(1)} dari 5 bintang`}>
      {"★".repeat(full)}
      <span className="text-slate-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export function RatingBadge({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span className="text-xs text-slate-400">Belum ada ulasan</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-400">★</span>
      <strong>{avg.toFixed(1)}</strong>
      <span className="text-slate-500">({count} ulasan)</span>
    </span>
  );
}
