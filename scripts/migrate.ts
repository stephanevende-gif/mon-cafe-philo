import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "../src/db";

async function main() {
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  await migrate(db, { migrationsFolder: "drizzle" });
  await pool.end();
  console.log("Base de données à jour.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
