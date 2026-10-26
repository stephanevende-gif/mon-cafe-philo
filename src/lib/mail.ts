import nodemailer from "nodemailer";

export function appUrl(path = ""): string {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}

export async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_HOST) {
    // Développement : pas de serveur d'envoi configuré.
    console.info(`\n[e-mail non envoyé, SMTP absent] À : ${to}\nObjet : ${subject}\n\n${text}\n`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
