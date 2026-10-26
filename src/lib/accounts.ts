import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { emailTokens, sessions, users, type User } from "@/db/schema";
import { startTrial } from "./access";
import { hashPassword, verifyPassword } from "./password";
import { hashToken, newToken } from "./tokens";

const HOUR = 60 * 60 * 1000;
export const SESSION_DAYS = 30;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(
  db: Db,
  input: { email: string; password: string; displayName: string },
  now = new Date(),
): Promise<{ user: User; verificationToken: string } | { error: "email_pris" }> {
  const email = normalizeEmail(input.email);
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { error: "email_pris" };
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, displayName: input.displayName.trim() })
    .returning();
  // L'essai de 30 jours commence à l'activation du compte.
  await startTrial(db, user.id, now);
  const verificationToken = await createEmailToken(db, user.id, "verification", 48 * HOUR);
  return { user, verificationToken };
}

export async function createEmailToken(
  db: Db,
  userId: string,
  purpose: "verification" | "reinitialisation",
  ttlMs: number,
): Promise<string> {
  const token = newToken();
  await db.insert(emailTokens).values({
    id: hashToken(token),
    userId,
    purpose,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return token;
}

export async function consumeEmailToken(
  db: Db,
  token: string,
  purpose: "verification" | "reinitialisation",
): Promise<string | null> {
  const [row] = await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(emailTokens.id, hashToken(token)),
        eq(emailTokens.purpose, purpose),
        isNull(emailTokens.usedAt),
        gt(emailTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  return row?.userId ?? null;
}

export async function verifyEmail(db: Db, token: string): Promise<boolean> {
  const userId = await consumeEmailToken(db, token, "verification");
  if (!userId) return false;
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  return true;
}

export async function resetPassword(db: Db, token: string, password: string): Promise<boolean> {
  const userId = await consumeEmailToken(db, token, "reinitialisation");
  if (!userId) return false;
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId));
  // Un nouveau mot de passe ferme toutes les sessions ouvertes.
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return true;
}

// Empreinte factice pour que la durée de réponse ne révèle pas si un compte existe.
let dummyHash: Promise<string> | null = null;

export async function checkCredentials(db: Db, email: string, password: string): Promise<User | null> {
  const user = await db.query.users.findFirst({ where: eq(users.email, normalizeEmail(email)) });
  if (!user) {
    dummyHash ??= hashPassword("mot-de-passe-factice");
    await verifyPassword(await dummyHash, password);
    return null;
  }
  return (await verifyPassword(user.passwordHash, password)) ? user : null;
}

export async function createSession(db: Db, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * HOUR);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function userForSession(db: Db, token: string): Promise<User | null> {
  const row = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row[0]?.user ?? null;
}

export async function deleteSession(db: Db, token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}
