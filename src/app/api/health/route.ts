import { checkDb } from "@/lib/db";

/** Cek cepat setelah deploy: buka /api/health di browser. */
export async function GET() {
  const db = await checkDb();
  return Response.json(
    {
      status: db.ok ? "ok" : "error",
      database: db.mode,
      env: {
        TURSO_DATABASE_URL: Boolean(process.env.TURSO_DATABASE_URL?.trim()),
        TURSO_AUTH_TOKEN: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
      },
      ...(db.error && { error: db.error }),
    },
    { status: db.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
  );
}
