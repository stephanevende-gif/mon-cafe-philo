import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import type { User } from "@/db/schema";
import { createSession, deleteSession, userForSession } from "./accounts";
import { getAccess } from "./access";

const COOKIE = "cafe_session";

export async function openSession(userId: string) {
  const { token, expiresAt } = await createSession(db, userId);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function closeSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await deleteSession(db, token);
  jar.delete(COOKIE);
}

export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const user = await userForSession(db, token);
  if (!user || user.suspendedAt) return null;
  return user;
});

export async function requireUser(next = "/"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(next)}`);
  return user;
}

export const currentAccess = cache(async () => {
  const user = await currentUser();
  if (!user) return null;
  return getAccess(db, user.id);
});

export function isEditor(user: User | null): boolean {
  return !!user && (user.role === "editeur" || user.role === "admin");
}

export async function requireEditor(): Promise<User> {
  const user = await requireUser("/admin");
  if (!isEditor(user)) redirect("/");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/admin");
  return user;
}
