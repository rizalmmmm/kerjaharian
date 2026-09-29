import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { batch, get } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/foto/[id]">) {
  const { id } = await ctx.params;
  const photo = await get<{ mime: string; data: string }>("SELECT mime, data FROM photos WHERE id = ?", [id]);
  if (!photo) return new Response("Tidak ditemukan", { status: 404 });
  return new Response(Buffer.from(photo.data, "base64"), {
    headers: {
      "Content-Type": photo.mime,
      // id foto unik & tidak pernah diubah, jadi aman di-cache selamanya
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/foto/[id]">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Harus masuk." }, { status: 401 });
  const { id } = await ctx.params;
  const photo = await get<{ kind: string }>("SELECT kind FROM photos WHERE id = ? AND user_id = ?", [id, user.id]);
  if (!photo) return Response.json({ error: "Tidak ditemukan." }, { status: 404 });
  await batch([
    { sql: "DELETE FROM photos WHERE id = ?", args: [id] },
    { sql: "UPDATE users SET avatar_id = NULL WHERE id = ? AND avatar_id = ?", args: [user.id, id] },
  ]);
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
