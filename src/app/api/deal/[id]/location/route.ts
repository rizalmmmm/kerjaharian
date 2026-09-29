import { authorizeDeal } from "@/lib/deal-api";
import { canShareLocation, clearLocation, upsertLocation } from "@/lib/deal";

const isCoord = (v: unknown, max: number): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max;

/** Perbarui lokasi GPS user saat ini untuk deal ini. */
export async function PUT(req: Request, ctx: RouteContext<"/api/deal/[id]/location">) {
  const auth = await authorizeDeal(ctx.params);
  if (auth.error) return auth.error;
  const { user, deal } = auth;
  if (!canShareLocation(deal)) {
    return Response.json({ error: "Lokasi hanya bisa dibagikan setelah lamaran diterima." }, { status: 403 });
  }

  const { lat, lng, accuracy } = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isCoord(lat, 90) || !isCoord(lng, 180)) return Response.json({ error: "Koordinat tidak valid." }, { status: 400 });
  upsertLocation(deal.id, user.id, lat, lng, typeof accuracy === "number" && accuracy >= 0 ? accuracy : 0);
  return Response.json({ ok: true });
}

/** Berhenti membagikan lokasi. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/deal/[id]/location">) {
  const auth = await authorizeDeal(ctx.params);
  if (auth.error) return auth.error;
  clearLocation(auth.deal.id, auth.user.id);
  return Response.json({ ok: true });
}
