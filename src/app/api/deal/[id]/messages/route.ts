import { authorizeDeal } from "@/lib/deal-api";
import { addMessage, canChat } from "@/lib/deal";

export async function POST(req: Request, ctx: RouteContext<"/api/deal/[id]/messages">) {
  const auth = await authorizeDeal(ctx.params);
  if (auth.error) return auth.error;
  const { user, deal } = auth;
  if (!canChat(deal)) return Response.json({ error: "Chat ditutup untuk lamaran yang ditolak." }, { status: 403 });

  const { body } = (await req.json().catch(() => ({}))) as { body?: unknown };
  const text = typeof body === "string" ? body.trim().slice(0, 2000) : "";
  if (!text) return Response.json({ error: "Pesan kosong." }, { status: 400 });

  return Response.json({ message: addMessage(deal.id, user.id, text) });
}
