/* eslint-disable @next/next/no-img-element -- foto dilayani dari /api/foto, tidak perlu next/image */
const SIZES = { sm: "h-9 w-9 text-sm", md: "h-12 w-12 text-base", lg: "h-24 w-24 text-3xl" } as const;

export function Avatar({ name, photoId, size = "sm" }: { name: string; photoId?: string | null; size?: keyof typeof SIZES }) {
  const cls = `${SIZES[size]} shrink-0 rounded-full object-cover`;
  if (photoId) return <img src={`/api/foto/${photoId}`} alt={name} className={cls} loading="lazy" />;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className={`${cls} grid place-items-center bg-brand-100 font-bold text-brand-700`} aria-hidden="true">
      {initials}
    </span>
  );
}
