import "dotenv/config";
import { eq } from "drizzle-orm";
import { createDb } from "../src/db";
import { users } from "../src/db/schema";
import { registerUser } from "../src/lib/accounts";
import { passwordProblem } from "../src/lib/password";

// Usage : npm run admin:create -- adresse@exemple.fr "Nom" "mot de passe"
async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) throw new Error('Usage : npm run admin:create -- email "Nom" "mot de passe"');
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const { db, pool } = createDb(process.env.DATABASE_URL!);
  const r = await registerUser(db, { email, password, displayName: name });
  const id = "error" in r ? (await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) }))!.id : r.user.id;
  await db.update(users).set({ role: "admin", emailVerifiedAt: new Date() }).where(eq(users.id, id));
  await pool.end();
  console.log(`Compte administrateur prêt : ${email}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
