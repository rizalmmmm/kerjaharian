const VARIANTS = {
  email: "bg-sky-100 text-sky-700",
  wa: "bg-green-100 text-green-700",
} as const;

export function VerifiedBadge({
  label = "Email terverifikasi",
  variant = "email",
}: {
  label?: string;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${VARIANTS[variant]}`}
      title={label}
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </span>
  );
}
