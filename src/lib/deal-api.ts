import "server-only";
import { getCurrentUser, type User } from "./auth";
import { getDealForUser, type Deal } from "./deal";

type Ok = { user: User; deal: Deal; error?: undefined };
type Err = { error: Response };

/** Otentikasi + otorisasi untuk route handler /api/deal/[id]/*. */
export async function authorizeDeal(params: Promise<{ id: string }>): Promise<Ok | Err> {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Harus masuk." }, { status: 401 }) };
  const id = Number((await params).id);
  const deal = Number.isInteger(id) ? getDealForUser(id, user.id) : null;
  if (!deal) return { error: Response.json({ error: "Tidak ditemukan." }, { status: 404 }) };
  return { user, deal };
}
