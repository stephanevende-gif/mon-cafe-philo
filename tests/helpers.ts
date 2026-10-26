import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "@/db";

// Base dédiée aux tests, vidée avant chaque fichier.
export async function testDb() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://cafe:cafe@localhost:5432/cafephilo_test";
  const { db, pool } = createDb(url);
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.execute(
    sql`truncate users, sessions, email_tokens, rate_events, access_periods, speakers, videos, books, sheets, notebook_entries, sync_runs cascade`,
  );
  return { db, close: () => pool.end() };
}
