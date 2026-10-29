import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { count, eq } from "drizzle-orm";
import { createDb } from "../src/db";
import { sheets, users } from "../src/db/schema";
import { registerUser } from "../src/lib/accounts";
import { passwordProblem } from "../src/lib/password";
import { applyDrafts, type DraftBundle } from "../src/lib/draft-transfer";
import { fillGenders } from "../src/lib/automation";
import { directUrl } from "./direct-url";

// Version de test en ligne, lancé à chaque déploiement après les migrations :
// 1. une base vide reçoit l'instantané des fiches, auteurs, livres et vidéos préparés (aucun compte lecteur) ;
// 2. les brouillons IA préparés hors ligne complètent les fiches que personne n'a encore touchées ;
// 3. le compte administrateur ADMIN_EMAIL / ADMIN_PASSWORD est créé s'il n'existe pas.
// Une base qui contient déjà des fiches n'est jamais modifiée par l'instantané.
const SNAPSHOT = "data/instantane-test.sql.gz";
const DRAFTS = "data/brouillons-ia.json.gz";

async function main() {
  if (!process.env.DATABASE_URL) {
    // Premier déploiement, avant que la base soit reliée : rien à faire.
    console.warn("DATABASE_URL absent : étape ignorée.");
    return;
  }
  const { db, pool } = createDb(directUrl());
  const [{ n }] = await db.select({ n: count() }).from(sheets);
  if (n === 0 && existsSync(SNAPSHOT)) {
    // Les commandes propres à psql (lignes commençant par « \ ») ne sont pas du SQL. Les réglages de session
    // de l'en-tête (dont un search_path vide) sont retirés : derrière le pooler de Neon, ils resteraient
    // sur la connexion partagée et casseraient les requêtes suivantes. Les INSERT nomment le schéma public.
    const lines = gunzipSync(readFileSync(SNAPSHOT)).toString("utf8").split("\n");
    const firstInsert = lines.findIndex((l) => l.startsWith("INSERT INTO "));
    const sql = lines
      .filter((l, i) => !l.startsWith("\\") && !(i < firstInsert && /^(SET |SELECT pg_catalog\.set_config)/.test(l)))
      .join("\n");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log("Instantané des fiches importé.");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release(true);
    }
  }

  if (existsSync(DRAFTS)) {
    const bundle = JSON.parse(gunzipSync(readFileSync(DRAFTS)).toString("utf8")) as DraftBundle;
    const r = await applyDrafts(db, bundle);
    console.log(`Brouillons IA : ${r.sheets} fiches complétées, ${r.speakers} intervenants ajoutés, ${r.videos} vidéos reliées, ${r.articles} fiches avec leurs deux articles.`);
  }
  console.log(`Intervenants : ${await fillGenders(db)} femme(s) ou homme(s) renseigné(s) d'après leur présentation.`);

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (!existing) {
      const problem = passwordProblem(password);
      if (problem) throw new Error(`ADMIN_PASSWORD : ${problem}`);
      const r = await registerUser(db, { email, password, displayName: process.env.ADMIN_NAME || "Administrateur" });
      if (!("error" in r)) {
        await db.update(users).set({ role: "admin", emailVerifiedAt: new Date() }).where(eq(users.id, r.user.id));
        console.log(`Compte administrateur créé : ${email}`);
      }
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
