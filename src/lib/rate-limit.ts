import { and, eq, gte, lt, count } from "drizzle-orm";
import type { Db } from "@/db";
import { rateEvents } from "@/db/schema";

// Enregistre une tentative et indique si la limite est dépassée sur la fenêtre donnée.
export async function hitLimit(db: Db, bucket: string, limit: number, windowMs: number): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);
  const [{ n }] = await db
    .select({ n: count() })
    .from(rateEvents)
    .where(and(eq(rateEvents.bucket, bucket), gte(rateEvents.createdAt, since)));
  if (n >= limit) return true;
  await db.insert(rateEvents).values({ bucket });
  return false;
}

export async function purgeRateEvents(db: Db, olderThanMs = 24 * 60 * 60 * 1000) {
  await db.delete(rateEvents).where(lt(rateEvents.createdAt, new Date(Date.now() - olderThanMs)));
}
