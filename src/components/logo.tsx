/** Logo kerja-harian.id: matahari terbit dari tas kerja — "kerja hari ini". */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="kh-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#kh-bg)" />
      <g stroke="#fcd34d" strokeWidth="3.6" strokeLinecap="round">
        <path d="M32 9.5v4.5" />
        <path d="M19.3 14.8l3.2 3.2" />
        <path d="M44.7 14.8l-3.2 3.2" />
        <path d="M14 27.5h4.5" />
        <path d="M50 27.5h-4.5" />
      </g>
      <path d="M21 33a11 11 0 0 1 22 0z" fill="#fbbf24" />
      <rect x="11" y="31" width="42" height="23" rx="5" fill="#fff" />
      <path d="M11 40.5h42" stroke="#047857" strokeWidth="2.4" opacity=".35" />
      <rect x="28" y="37.5" width="8" height="6.5" rx="1.8" fill="#059669" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`${compact ? "hidden sm:inline" : ""} text-lg font-extrabold tracking-tight text-slate-900`}>
        kerja-harian<span className="text-brand-600">.id</span>
      </span>
    </span>
  );
}
