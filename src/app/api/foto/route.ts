import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { batch, get } from "@/lib/db";
import { MAX_PORTFOLIO } from "@/lib/profile";

const MAX_BYTES = 700 * 1024; // foto sudah dikompres di browser; ini batas pengaman
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Unggah foto profil (kind=avatar) atau portofolio (kind=portfolio, maks. 3). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Harus masuk." }, { status: 401 });

  const fd = await req.formData().catch(() => null);
  const kind = fd?.get("kind");
  const file = fd?.get("file");
  if (kind !== "avatar" && kind !== "portfolio") return Response.json({ error: "Jenis foto tidak valid." }, { status: 400 });
  if (!(file instanceof File) || !TYPES.includes(file.type)) {
    return Response.json({ error: "Format foto harus JPG, PNG, atau WebP." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return Response.json({ error: "Ukuran foto terlalu besar." }, { status: 400 });

  if (kind === "portfolio") {
    const { n } = (await get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM photos WHERE user_id = ? AND kind = 'portfolio'",
      [user.id],
    ))!;
    if (n >= MAX_PORTFOLIO) return Response.json({ error: `Maksimal ${MAX_PORTFOLIO} foto portofolio.` }, { status: 400 });
  }

  const id = randomBytes(12).toString("base64url");
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const insert = {
    sql: "INSERT INTO photos (id, user_id, kind, mime, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, user.id, kind, file.type, data, new Date().toISOString()],
  };
  await batch(
    kind === "avatar"
      ? [
          { sql: "DELETE FROM photos WHERE user_id = ? AND kind = 'avatar'", args: [user.id] },
          insert,
          { sql: "UPDATE users SET avatar_id = ? WHERE id = ?", args: [id, user.id] },
        ]
      : [insert],
  );
  revalidatePath("/", "layout");
  return Response.json({ id });
}
