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
  children,
}: {
  action: Action;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "grid gap-4"}>
      {children}
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700" role="status">
          {state.ok}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
