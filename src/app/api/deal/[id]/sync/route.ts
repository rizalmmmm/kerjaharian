import type { NextRequest } from "next/server";
import { authorizeDeal } from "@/lib/deal-api";
import { canShareLocation, listLocations, listMessages, markRead } from "@/lib/deal";

/** Polling: pesan baru sejak `after` + lokasi live kedua pihak. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/deal/[id]/sync">) {
  const auth = await authorizeDeal(ctx.params);
  if (auth.error) return auth.error;
  const { user, deal } = auth;

  const after = Number(req.nextUrl.searchParams.get("after") ?? 0) || 0;
  const messages = await listMessages(deal.id, after);
  if (messages.length) await markRead(deal.id, user.id, messages[messages.length - 1].id);

  return Response.json({
    status: deal.status,
    messages,
    locations: canShareLocation(deal) ? await listLocations(deal.id) : [],
  });
}
