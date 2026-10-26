import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["membre", "editeur", "admin"]);
export const tokenPurposeEnum = pgEnum("token_purpose", ["verification", "reinitialisation"]);
export const accessKindEnum = pgEnum("access_kind", ["essai", "paiement", "attribution"]);
export const videoKindEnum = pgEnum("video_kind", ["short", "conference"]);
export const sheetStatusEnum = pgEnum("sheet_status", ["brouillon", "a_verifier", "validee"]);
export const stageEnum = pgEnum("notebook_stage", ["je_pense", "je_suis"]);
export const runKindEnum = pgEnum("run_kind", ["youtube", "planification"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: roleEnum("role").notNull().default("membre"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspensionReason: text("suspension_reason"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    // Empreinte SHA-256 du jeton : le jeton lui-même n'est jamais stocké.
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const emailTokens = pgTable("email_tokens", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: tokenPurposeEnum("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

// Tentatives de connexion et d'envoi, pour limiter les abus.
export const rateEvents = pgTable(
  "rate_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucket: text("bucket").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("rate_events_bucket_idx").on(t.bucket, t.createdAt)],
);

// Chaque période d'accès : 30 jours d'essai, 335 jours payés, ou attribution manuelle.
export const accessPeriods = pgTable(
  "access_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: accessKindEnum("kind").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    amountCents: integer("amount_cents"),
    reference: text("reference"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("access_user_idx").on(t.userId)],
);

export const speakers = pgTable("speakers", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  qualification: text("qualification").notNull(),
  qualificationSource: text("qualification_source"),
  // Rempli seulement quand un membre de l'équipe a vérifié l'identité et la qualification.
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  photoUrl: text("photo_url"),
  createdAt: createdAt(),
});

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  youtubeId: text("youtube_id").notNull().unique(),
  kind: videoKindEnum("kind").notNull(),
  title: text("title").notNull(),
  speakerId: uuid("speaker_id").references(() => speakers.id, { onDelete: "set null" }),
  durationSeconds: integer("duration_seconds"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  description: text("description"),
  channelId: text("channel_id"),
  // Vidéo détectée automatiquement dans la playlist (et non saisie à la main).
  detectedAt: timestamp("detected_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const books = pgTable("books", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  author: text("author").notNull(),
  isbn: text("isbn"),
  catalogueUrl: text("catalogue_url"),
  coverUrl: text("cover_url"),
  summary: text("summary"),
  createdAt: createdAt(),
});

export const sheets = pgTable(
  "sheets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Jour de publication (heure de Paris). Vide pour une fiche non programmée.
    day: date("day", { mode: "string" }),
    // Titre de la fiche : « Aujourd'hui, on s'interroge sur… ». Vide pour les anciennes fiches.
    title: text("title"),
    theme: text("theme").notNull(),
    question: text("question").notNull(),
    synthesis: text("synthesis"),
    shortVideoId: uuid("short_video_id").references(() => videos.id, { onDelete: "set null" }),
    lectureVideoId: uuid("lecture_video_id").references(() => videos.id, { onDelete: "set null" }),
    bookId: uuid("book_id").references(() => books.id, { onDelete: "set null" }),
    status: sheetStatusEnum("status").notNull().default("brouillon"),
    isBackup: boolean("is_backup").notNull().default(false),
    // Vérification de l'origine humaine de l'intervention : condition d'affichage de la mention.
    authenticityVerifiedAt: timestamp("authenticity_verified_at", { withTimezone: true }),
    authenticityVerifiedBy: uuid("authenticity_verified_by").references(() => users.id, { onDelete: "set null" }),
    sources: text("sources"),
    editorialNotes: text("editorial_notes"),
    // Rediffusion d'une fiche déjà publiée, quand aucun nouveau Short n'est paru.
    replayOf: uuid("replay_of"),
    // Vrai si le thème, la question ou la synthèse ont été proposés par un outil d'IA.
    aiDrafted: boolean("ai_drafted").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sheets_day_idx").on(t.day), index("sheets_theme_idx").on(t.theme)],
);

export const notebookEntries = pgTable(
  "notebook_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sheetId: uuid("sheet_id").notNull().references(() => sheets.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    stage: stageEnum("stage").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("notebook_version_idx").on(t.userId, t.sheetId, t.version)],
);

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: runKindEnum("kind").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok"),
  summary: text("summary"),
  error: text("error"),
});

export type User = typeof users.$inferSelect;
export type Sheet = typeof sheets.$inferSelect;
export type Speaker = typeof speakers.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Book = typeof books.$inferSelect;
export type NotebookEntry = typeof notebookEntries.$inferSelect;
export type AccessPeriod = typeof accessPeriods.$inferSelect;
