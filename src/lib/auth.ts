import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { get, run } from "./db";
import type { Role } from "./constants";

const COOKIE = "kh_session";
const SESSION_DAYS = 30;

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  city: string;
  bio: string;
  email_verified_at: string | null;
  avatar_id: string | null;
  instagram: string | null;
  facebook: string | null;
};

export async function createSession(userId: number | bigint) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [token, userId, expires.toISOString()]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token = ?", [token]);
  store.delete(COOKIE);
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return get<User>(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.city, u.bio, u.email_verified_at, u.avatar_id, u.instagram, u.facebook
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, new Date().toISOString()],
  );
});

export async function requireUser(role?: Role): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");
  if (role && user.role !== role) redirect("/dasbor");
  return user;
}
