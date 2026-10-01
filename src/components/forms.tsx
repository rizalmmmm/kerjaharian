"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

/** Form yang menampilkan pesan error/sukses dari server action. */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Memproses…",
  className,
  submitClassName = "btn-primary",
  children,
}: {
  action: Action;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  submitClassName?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "grid gap-4"}>
      {children}
      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-base font-medium text-red-700" role="alert">
          ⚠️ {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-base font-medium text-brand-700" role="status">
          ✅ {state.ok}
        </p>
      )}
      <button className={submitClassName} disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
