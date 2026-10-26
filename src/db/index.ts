import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __cafeDb?: Db; __cafePool?: Pool };

export function createDb(url: string): { db: Db; pool: Pool } {
  const pool = new Pool({ connectionString: url, max: 10 });
  return { db: drizzle(pool, { schema }), pool };
}

function getDb(): Db {
  if (!globalForDb.__cafeDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL n'est pas défini.");
    const { db, pool } = createDb(url);
    globalForDb.__cafeDb = db;
    globalForDb.__cafePool = pool;
  }
  return globalForDb.__cafeDb;
}

// Connexion paresseuse : rien n'est ouvert tant qu'aucune requête n'est faite.
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export { schema };
