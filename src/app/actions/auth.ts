"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  checkCredentials,
  createEmailToken,
  normalizeEmail,
  registerUser,
  resetPassword,
} from "@/lib/accounts";
import { closeSession, openSession, requireUser } from "@/lib/auth";
import { appUrl, sendMail } from "@/lib/mail";
import { passwordProblem, verifyPassword } from "@/lib/password";
import { hitLimit } from "@/lib/rate-limit";

const MIN = 60 * 1000;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function safeNext(v: FormDataEntryValue | null): string {
  const p = typeof v === "string" ? v : "/";
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
}

async function sendVerification(email: string, token: string) {
  await sendMail(
    email,
    "Confirmez votre adresse · Mon café philo",
    `Bonjour,\n\nPour confirmer votre adresse e-mail, ouvrez ce lien (valable 48 heures) :\n${appUrl(`/verifier?jeton=${token}`)}\n\nSi vous n'avez pas créé de compte sur Mon café philo, ignorez ce message.\n\nLes Éditions M-Éditer`,
  );
}

const signupSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(200),
  password: z.string(),
});

export async function signup(formData: FormData) {
  // Champ piège invisible : un humain ne le remplit pas.
  if (formData.get("site")) redirect("/inscription?message=champs");
  if (formData.get("conditions") !== "on") redirect("/inscription?message=consentement");
  const parsed = signupSchema.safeParse({
    displayName: formData.get("nom"),
    email: formData.get("email"),
    password: formData.get("motdepasse"),
  });
  if (!parsed.success) redirect("/inscription?message=champs");
  if (passwordProblem(parsed.data.password)) redirect("/inscription?message=mot_de_passe");
  if (await hitLimit(db, `inscription:${await clientIp()}`, 5, 60 * MIN)) redirect("/inscription?message=limite");
  const result = await registerUser(db, parsed.data);
  if ("error" in result) redirect(`/inscription?message=${result.error}`);
  await sendVerification(result.user.email, result.verificationToken);
  await openSession(result.user.id);
  redirect("/?message=bienvenue");
}

export async function login(formData: FormData) {
  const next = safeNext(formData.get("suite"));
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("motdepasse") ?? "");
  const back = `/connexion?suite=${encodeURIComponent(next)}`;
  if (
    (await hitLimit(db, `connexion:${email}`, 8, 15 * MIN)) ||
    (await hitLimit(db, `connexion-ip:${await clientIp()}`, 30, 15 * MIN))
  ) {
    redirect(`${back}&message=limite`);
  }
  const user = await checkCredentials(db, email, password);
  if (!user) redirect(`${back}&message=identifiants`);
  if (user.suspendedAt) redirect(`${back}&message=suspendu`);
  await openSession(user.id);
  redirect(next);
}

export async function logout() {
  await closeSession();
  redirect("/");
}

export async function requestReset(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (await hitLimit(db, `reinit:${await clientIp()}`, 5, 60 * MIN)) redirect("/mot-de-passe-oublie?message=limite");
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user && !(await hitLimit(db, `reinit:${user.id}`, 3, 60 * MIN))) {
    const token = await createEmailToken(db, user.id, "reinitialisation", 60 * MIN);
    await sendMail(
      user.email,
      "Nouveau mot de passe · Mon café philo",
      `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable une heure) :\n${appUrl(`/reinitialiser?jeton=${token}`)}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nLes Éditions M-Éditer`,
    );
  }
  // Même réponse dans tous les cas, pour ne pas révéler quelles adresses ont un compte.
  redirect("/mot-de-passe-oublie?message=envoye");
}

export async function doReset(formData: FormData) {
  const token = String(formData.get("jeton") ?? "");
  const password = String(formData.get("motdepasse") ?? "");
  if (passwordProblem(password)) redirect(`/reinitialiser?jeton=${encodeURIComponent(token)}&message=mot_de_passe`);
  const ok = await resetPassword(db, token, password);
  redirect(ok ? "/connexion?message=reinitialise" : "/mot-de-passe-oublie?message=jeton");
}

export async function resendVerification() {
  const user = await requireUser("/compte");
  if (user.emailVerifiedAt) redirect("/compte");
  if (await hitLimit(db, `verif:${user.id}`, 3, 60 * MIN)) redirect("/compte?message=limite");
  const token = await createEmailToken(db, user.id, "verification", 48 * 60 * MIN);
  await sendVerification(user.email, token);
  redirect("/compte?message=envoye");
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser("/compte");
  const name = String(formData.get("nom") ?? "").trim().slice(0, 60);
  if (!name) redirect("/compte?message=champs");
  await db.update(users).set({ displayName: name }).where(eq(users.id, user.id));
  redirect("/compte?message=sauve");
}

export async function deleteAccount(formData: FormData) {
  const user = await requireUser("/compte");
  const ok =
    formData.get("confirmation") === "SUPPRIMER" &&
    (await verifyPassword(user.passwordHash, String(formData.get("motdepasse") ?? "")));
  if (!ok) redirect("/compte?message=confirmation");
  // Les sessions, le carnet et les périodes d'accès sont supprimés en cascade.
  await db.delete(users).where(eq(users.id, user.id));
  await closeSession();
  redirect("/");
}
